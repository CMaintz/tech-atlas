/**
 * Cytoscape glue shared by the Explorer and the term-page graph (A74): the stylesheet
 * (graph-cytoscape/stylesheet.ts), element data built from graph-style, hover
 * highlighting, the animated flow along one-way edges and the eased fit. Browser-only;
 * the pure mapping it relies on lives in graph-style.ts.
 */
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

/**
 * The page's resolved theme (A92): `data-theme` on <html>, set before first paint by
 * theme-init.js and kept in step with the menu and the OS by Base.astro; the OS
 * preference when there is no attribute. 'dark' outside a browser.
 */
export function currentTheme(): MapTheme {
  if (typeof document === 'undefined') return 'dark';
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/** Call `fn` with the new theme whenever it changes (menu or OS). Returns a stop function. */
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

/** The Cytoscape data fields an edge's paint sets. */
const paintData = (p: EdgePaint) => ({
  colour: p.colour,
  arrow: p.directed ? 'triangle' : 'none',
  directed: p.directed ? 1 : 0,
  cross: p.crossDomain ? 1 : 0,
  gradient: p.gradient ? p.gradient.join(' ') : undefined,
});

/** Cytoscape edge data for a list of links: colour, arrow, curve and cross-domain gradient. */
export function edgeData(
  links: Link[],
  nodeOf: (id: string) => Endpoint | undefined,
  width: (l: Link, i: number) => number,
  /** Resting opacity; hover, flow and highlight raise it. */
  alpha = 0.5,
  theme: MapTheme = 'dark',
) {
  const curves = curveOffsets(links);
  return links.map((l, i) => ({
    id: `e${i}`,
    source: l.source,
    target: l.target,
    type: l.type,
    ...paintData(edgePaint(l, nodeOf(l.source)!, nodeOf(l.target)!, theme)),
    curve: curves[i],
    width: width(l, i),
    alpha,
  }));
}

/**
 * Hovering a node lights its neighbourhood, fades the rest and sets its one-way edges
 * flowing. Only childless nodes react (never a compound parent, should one be added).
 */
export function attachHover(cy: cytoscape.Core) {
  cy.on('mouseover', 'node:childless', (e) => {
    const hood = e.target.closedNeighborhood();
    cy.batch(() => {
      cy.elements().not(hood).not(':parent').addClass('faded');
      hood.addClass('lit');
      hood.edges('[?directed]').addClass('hflow');
    });
    cy.container()!.style.cursor = 'pointer';
  });
  cy.on('mouseout', 'node:childless', () => {
    cy.batch(() => cy.elements().removeClass('faded lit hflow'));
    cy.container()!.style.cursor = 'default';
  });
}

/**
 * Animate dashes along every edge carrying `flow`/`hflow`, source → target, at `fps`.
 * The loop idles while nothing (or too much) flows and wakes when edge classes change;
 * it stops and starts with the prefers-reduced-motion setting, live (the dashes stay
 * still while motion is reduced). Returns a stop function.
 */
export function startFlow(cy: cytoscape.Core, limit = 160, fps = 30): () => void {
  const motion = typeof window !== 'undefined' ? window.matchMedia?.(REDUCED_MOTION) : undefined;
  let raf = 0;
  let last = 0;
  let stopped = false;
  const tick = (t: number) => {
    raf = 0;
    if (stopped || motion?.matches) return;
    const flowing = cy.edges('.flow, .hflow');
    // Nothing to animate: idle until a class change wakes the loop.
    if (flowing.empty() || flowing.length > limit) return;
    raf = requestAnimationFrame(tick);
    if (t - last < 1000 / fps) return;
    last = t;
    flowing.style('line-dash-offset', flowOffset(t));
  };
  const wake = () => {
    if (!raf && !stopped && !motion?.matches) raf = requestAnimationFrame(tick);
  };
  cy.on('class', 'edge', wake);
  motion?.addEventListener?.('change', wake);
  wake();
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    cy.removeListener('class', 'edge', wake);
    motion?.removeEventListener?.('change', wake);
  };
}

/**
 * Fit the graph with a short ease-in zoom (instant under reduced motion). `reserveRight`
 * keeps that many pixels on the right clear, for an overlay such as the legend.
 */
export function smoothFit(
  cy: cytoscape.Core,
  padding = 40,
  maxZoom = 1.1,
  reserveRight = 0,
  /** What to fit; every node (with its label) by default. */
  eles: cytoscape.CollectionReturnValue | cytoscape.NodeCollection = cy.nodes(),
) {
  // Fit every node with its label, so region and cluster names stay in view.
  const bb = eles.boundingBox();
  if (!bb.w || !bb.h) return;
  const { width, zoom } = fitFrame(cy, bb, padding, maxZoom, reserveRight);
  const pan = centredPan(bb, zoom, width, cy.height());
  if (reducedMotion()) cy.viewport({ zoom, pan });
  else easeIn(cy, bb, width, zoom, pan);
}

type Box = { x1: number; y1: number; w: number; h: number };
type Pan = { x: number; y: number };

/** The pan that centres a box in a `width` × `height` view at `zoom`. */
const centredPan = (bb: Box, zoom: number, width: number, height: number): Pan => ({
  x: width / 2 - zoom * (bb.x1 + bb.w / 2),
  y: height / 2 - zoom * (bb.y1 + bb.h / 2),
});

/**
 * The width to fit into — the view less `reserveRight`, unless that would leave less
 * than half of it — and the zoom that fits the box there with `padding` round it.
 */
function fitFrame(
  cy: cytoscape.Core,
  bb: Box,
  padding: number,
  maxZoom: number,
  reserveRight: number,
): { width: number; zoom: number } {
  const width = cy.width() - (cy.width() - reserveRight > cy.width() / 2 ? reserveRight : 0);
  const zoom = Math.min(
    maxZoom,
    Math.max(cy.minZoom(), (width - 2 * padding) / bb.w),
    Math.max(cy.minZoom(), (cy.height() - 2 * padding) / bb.h),
  );
  return { width, zoom };
}

/** Start a little further out than `zoom` and ease in to it. */
function easeIn(cy: cytoscape.Core, bb: Box, width: number, zoom: number, pan: Pan): void {
  const from = zoom * 0.8;
  cy.viewport({ zoom: from, pan: centredPan(bb, from, width, cy.height()) });
  cy.animate({ zoom, pan }, { duration: 550, easing: 'ease-out-cubic' });
}
