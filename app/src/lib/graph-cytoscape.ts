import type cytoscape from 'cytoscape';
import type { EdgeType } from '../schema';
import type { Family } from './graph-model';
import {
  curveOffsets,
  edgePaint,
  flowOffset,
  type EdgePaint,
  type MapTheme,
  type Paintable,
} from './graph-style';

export { FADE_TRANSITIONS, GRAPH_STYLE, graphStyle } from './graph-cytoscape/stylesheet';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
export const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.(REDUCED_MOTION).matches;

export function currentTheme(): MapTheme {
  if (typeof document === 'undefined') return 'dark';
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function watchTheme(fn: (theme: MapTheme) => void): () => void {
  let last = currentTheme();
  const obs = new MutationObserver(() => {
    const now = currentTheme();
    if (now !== last) fn((last = now));
  });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => obs.disconnect();
}

type Endpoint = Paintable & { id: string };
type Link = { source: string; target: string; type: EdgeType; family: Family };
type EndpointLookup = (id: string) => Endpoint | undefined;

const paintData = (p: EdgePaint) => ({
  colour: p.colour,
  arrow: p.directed ? 'triangle' : 'none',
  directed: p.directed ? 1 : 0,
  cross: p.crossDomain ? 1 : 0,
  gradient: p.gradient ? p.gradient.join(' ') : undefined,
});

export function edgeData(links: Link[], nodeOf: EndpointLookup, theme: MapTheme) {
  const curves = curveOffsets(links);
  return links.map((l, i) => ({
    id: `e${i}`,
    ...paintedLink(l, nodeOf, theme),
    curve: curves[i],
  }));
}

function paintedLink(l: Link, nodeOf: EndpointLookup, theme: MapTheme) {
  const ends = { source: endpointOf(nodeOf, l.source), target: endpointOf(nodeOf, l.target) };
  const paint = edgePaint(l, ends, theme);
  return { source: l.source, target: l.target, type: l.type, ...paintData(paint) };
}

function endpointOf(nodeOf: EndpointLookup, id: string): Endpoint {
  const node = nodeOf(id);
  if (!node) throw new Error(`edgeData: no node for edge endpoint ${id}`);
  return node;
}

export function attachHover(cy: cytoscape.Core) {
  cy.on('mouseover', 'node:childless', (e) => {
    const hood = e.target.closedNeighborhood();
    cy.batch(() => {
      cy.elements().not(hood).not(':parent').addClass('faded');
      hood.addClass('lit');
      hood.edges('[?directed]').addClass('hflow');
    });
    setCursor(cy, 'pointer');
  });
  cy.on('mouseout', 'node:childless', () => {
    cy.batch(() => cy.elements().removeClass('faded lit hflow'));
    setCursor(cy, 'default');
  });
}

function setCursor(cy: cytoscape.Core, cursor: string) {
  const container = cy.container();
  if (!container) throw new Error('attachHover: the graph has no container');
  container.style.cursor = cursor;
}

export function startFlow(cy: cytoscape.Core, limit = 160, fps = 30): () => void {
  const motion = typeof window !== 'undefined' ? window.matchMedia?.(REDUCED_MOTION) : undefined;
  const loop = new FlowLoop(cy, { limit, fps }, motion);
  cy.on('class', 'edge', loop.wake);
  motion?.addEventListener?.('change', loop.wake);
  loop.wake();
  return () => {
    loop.stop();
    cy.removeListener('class', 'edge', loop.wake);
    motion?.removeEventListener?.('change', loop.wake);
  };
}

type FlowPace = { limit: number; fps: number };

class FlowLoop {
  private raf = 0;
  private last = 0;
  private stopped = false;
  private readonly cy: cytoscape.Core;
  private readonly pace: FlowPace;
  private readonly motion: MediaQueryList | undefined;

  constructor(cy: cytoscape.Core, pace: FlowPace, motion: MediaQueryList | undefined) {
    this.cy = cy;
    this.pace = pace;
    this.motion = motion;
  }

  readonly wake = () => {
    if (!this.raf && !this.stopped && !this.motion?.matches) {
      this.raf = requestAnimationFrame(this.tick);
    }
  };

  stop() {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
  }

  private readonly tick = (t: number) => {
    this.raf = 0;
    if (this.stopped || this.motion?.matches) return;
    const flowing = this.cy.edges('.flow, .hflow');
    if (flowing.empty() || flowing.length > this.pace.limit) return;
    this.raf = requestAnimationFrame(this.tick);
    if (t - this.last < 1000 / this.pace.fps) return;
    this.last = t;
    flowing.style('line-dash-offset', flowOffset(t));
  };
}

export function smoothFit(
  cy: cytoscape.Core,
  { padding = 40, maxZoom = 1.1, reserveRight = 0 }: Partial<Framing> = {},
  eles: cytoscape.CollectionReturnValue | cytoscape.NodeCollection = cy.nodes(),
) {
  const bb = eles.boundingBox();
  if (!bb.w || !bb.h) return;
  const frame = fitFrame(cy, bb, { padding, maxZoom, reserveRight });
  const pan = centredPan(bb, { ...frame, height: cy.height() });
  if (reducedMotion()) cy.viewport({ zoom: frame.zoom, pan });
  else easeIn(cy, bb, { ...frame, pan });
}

type Box = { x1: number; y1: number; w: number; h: number };
type Pan = { x: number; y: number };
type Frame = { width: number; zoom: number };
type Framing = { padding: number; maxZoom: number; reserveRight: number };

const centredPan = (bb: Box, view: Frame & { height: number }): Pan => ({
  x: view.width / 2 - view.zoom * (bb.x1 + bb.w / 2),
  y: view.height / 2 - view.zoom * (bb.y1 + bb.h / 2),
});

function fitFrame(cy: cytoscape.Core, bb: Box, { padding, maxZoom, reserveRight }: Framing): Frame {
  const width = cy.width() - (cy.width() - reserveRight > cy.width() / 2 ? reserveRight : 0);
  const zoom = Math.min(
    maxZoom,
    Math.max(cy.minZoom(), (width - 2 * padding) / bb.w),
    Math.max(cy.minZoom(), (cy.height() - 2 * padding) / bb.h),
  );
  return { width, zoom };
}

function easeIn(cy: cytoscape.Core, bb: Box, { width, zoom, pan }: Frame & { pan: Pan }): void {
  const from = zoom * 0.8;
  cy.viewport({ zoom: from, pan: centredPan(bb, { width, zoom: from, height: cy.height() }) });
  cy.animate({ zoom, pan }, { duration: 550, easing: 'ease-out-cubic' });
}
