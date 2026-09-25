/**
 * Cytoscape glue shared by the Explorer and the term-page graph (A61): the stylesheet,
 * element data built from graph-style, hover highlighting and the animated flow along
 * one-way edges. Browser-only; the pure mapping it relies on lives in graph-style.ts.
 */
import type cytoscape from 'cytoscape';
import type { EdgeType } from '../schema';
import type { Family } from './graph-model';
import { FLOW_DASH, curveOffsets, edgePaint, flowOffset, type Paintable } from './graph-style';

export const reducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

type Endpoint = Paintable & { id: string };
type Link = { source: string; target: string; type: EdgeType; family: Family };

/** Cytoscape edge data for a list of links: colour, arrow, curve and cross-domain gradient. */
export function edgeData(
  links: Link[],
  nodeOf: (id: string) => Endpoint | undefined,
  width: (l: Link, i: number) => number,
  /** Resting opacity; hover, flow and highlight raise it. */
  alpha = 0.5,
) {
  const curves = curveOffsets(links);
  return links.map((l, i) => {
    const s = nodeOf(l.source)!;
    const t = nodeOf(l.target)!;
    const p = edgePaint(l, s, t);
    return {
      id: `e${i}`,
      source: l.source,
      target: l.target,
      type: l.type,
      colour: p.colour,
      arrow: p.directed ? 'triangle' : 'none',
      directed: p.directed ? 1 : 0,
      cross: p.crossDomain ? 1 : 0,
      gradient: p.gradient ? p.gradient.join(' ') : undefined,
      curve: curves[i],
      width: width(l, i),
      alpha,
    };
  });
}

/** The shared look: glowing nodes, domain rings, curved family-coloured edges. */
export const GRAPH_STYLE = [
  {
    selector: 'node[size]',
    style: {
      'background-color': 'data(colour)',
      width: 'data(size)',
      height: 'data(size)',
      label: 'data(label)',
      color: '#e5e5e5',
      'font-size': 'data(font)',
      'text-valign': 'bottom',
      'text-margin-y': 4,
      'text-outline-color': '#0a0a0a',
      'text-outline-width': 2,
      'text-outline-opacity': 0.9,
      'min-zoomed-font-size': 8,
      // Dark-theme glow: a soft halo in the node's own colour.
      'underlay-color': 'data(colour)',
      'underlay-opacity': 0.2,
      'underlay-padding': 5,
      'underlay-shape': 'ellipse',
      'transition-property': 'opacity, underlay-opacity, underlay-padding, text-opacity',
      'transition-duration': '0.18s',
    },
  },
  // A term in two domains wears a ring in the other domain's colour.
  {
    selector: 'node[ring]',
    style: { 'border-width': 3, 'border-color': 'data(ring)', 'border-opacity': 0.95 },
  },
  {
    selector: 'edge',
    style: {
      width: 'data(width)',
      'line-color': 'data(colour)',
      'target-arrow-color': 'data(colour)',
      'target-arrow-shape': 'data(arrow)',
      'arrow-scale': 0.8,
      'curve-style': 'unbundled-bezier',
      'control-point-distances': 'data(curve)',
      'control-point-weights': 0.5,
      'line-cap': 'round',
      opacity: 'data(alpha)',
      'transition-property': 'opacity',
      'transition-duration': '0.18s',
    },
  },
  // Edges that bridge two domains fade from one domain's colour to the other's.
  {
    selector: 'edge[?cross]',
    style: {
      'line-fill': 'linear-gradient',
      'line-gradient-stop-colors': 'data(gradient)',
      'line-gradient-stop-positions': '0 50 100',
    },
  },
  {
    selector: 'edge.flow, edge.hflow',
    style: { 'line-style': 'dashed', 'line-dash-pattern': FLOW_DASH, opacity: 0.95 },
  },
  // Hover: the neighbourhood stays lit, everything else fades back.
  { selector: 'node.faded', style: { opacity: 0.1, 'text-opacity': 0, 'underlay-opacity': 0 } },
  { selector: 'edge.faded', style: { opacity: 0.04 } },
  {
    selector: 'node.lit',
    style: {
      'underlay-opacity': 0.45,
      'underlay-padding': 9,
      'min-zoomed-font-size': 0,
      'z-index': 20,
    },
  },
  { selector: 'edge.lit', style: { opacity: 0.95, 'z-index': 19 } },
  // Route / prerequisite highlight and selection (Explorer).
  { selector: '.dim', style: { opacity: 0.1 } },
  { selector: 'node.hl', style: { 'underlay-opacity': 0.5, 'underlay-padding': 8 } },
  { selector: 'edge.hl', style: { opacity: 1, width: 3 } },
  {
    selector: 'node.sel',
    style: {
      'outline-width': 3,
      'outline-color': '#ffffff',
      'outline-offset': 3,
      'underlay-opacity': 0.55,
      'underlay-padding': 10,
      'min-zoomed-font-size': 0,
    },
  },
] as unknown as cytoscape.StylesheetJson;

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
 * Animate dashes along every edge carrying `flow`/`hflow`, source → target, at ~30 fps.
 * Does nothing under prefers-reduced-motion (the dashes stay still) or when too many
 * edges would flow at once. Returns a stop function.
 */
export function startFlow(cy: cytoscape.Core, limit = 160): () => void {
  if (reducedMotion()) return () => {};
  let raf = 0;
  let last = 0;
  const tick = (t: number) => {
    raf = requestAnimationFrame(tick);
    if (t - last < 33) return;
    last = t;
    const flowing = cy.edges('.flow, .hflow');
    if (flowing.empty() || flowing.length > limit) return;
    flowing.style('line-dash-offset', flowOffset(t));
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

/**
 * Fit the graph with a short ease-in zoom (instant under reduced motion). `reserveRight`
 * keeps that many pixels on the right clear, for an overlay such as the legend.
 */
export function smoothFit(cy: cytoscape.Core, padding = 40, maxZoom = 1.1, reserveRight = 0) {
  // Fit the terms only — decorative labels (Explorer's region names) may overhang.
  const bb = cy.nodes('[size]').boundingBox();
  if (!bb.w || !bb.h) return;
  const width = cy.width() - (cy.width() - reserveRight > cy.width() / 2 ? reserveRight : 0);
  const zoom = Math.min(
    maxZoom,
    Math.max(cy.minZoom(), (width - 2 * padding) / bb.w),
    Math.max(cy.minZoom(), (cy.height() - 2 * padding) / bb.h),
  );
  const pan = {
    x: width / 2 - zoom * (bb.x1 + bb.w / 2),
    y: cy.height() / 2 - zoom * (bb.y1 + bb.h / 2),
  };
  if (reducedMotion()) {
    cy.viewport({ zoom, pan });
    return;
  }
  // Start a little further out and ease in.
  const from = zoom * 0.8;
  cy.viewport({
    zoom: from,
    pan: {
      x: width / 2 - from * (bb.x1 + bb.w / 2),
      y: cy.height() / 2 - from * (bb.y1 + bb.h / 2),
    },
  });
  cy.animate({ zoom, pan }, { duration: 550, easing: 'ease-out-cubic' });
}
