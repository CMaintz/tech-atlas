/**
 * Which relationships the 2D map draws, and how: the backbone at rest, every
 * edge with "show all", a selected term's or a route's edges in focus; the island bundles
 * summarising what crosses between islands; and bundled routes for "show all".
 */
import type cytoscape from 'cytoscape';
import { EXPLORER } from '../explorer-config';
import type { Point } from '../graph-style';
import {
  backboneOf,
  bundleControls,
  linkVisible,
  pairKey,
  visibleBundleCounts,
} from '../graph-layout';
import { getOrThrow } from '../map-get';
import { reshow, type MapParts, type MapState } from './context';
import { bundleWidth } from './elements';
import type { View } from './types';

/** An edge whose classes change: applied at once or a batch per frame. */
export type EdgeChange = {
  e: cytoscape.EdgeSingular;
  bb: boolean;
  on: boolean;
  all: boolean;
  focus: boolean;
};

type Ends = { s: string; t: string; family: string; bb: boolean };
/** A relationship's edge, its index among the graph's links, and its last class bits. */
type EdgeMeta = Ends & { e: cytoscape.EdgeSingular; i: number; bits: number };
type LookView = Pick<View, 'nodes' | 'families' | 'showAll' | 'selected' | 'highlight'>;

const touches = (m: Ends, id: string | null) => m.s === id || m.t === id;
const withinRoute = (m: Ends, route: ReadonlySet<string>) => route.has(m.s) && route.has(m.t);

/**
 * How a relationship is drawn in a view. The families filter the overview only: a
 * selected term shows every one of its relationships.
 */
export function edgeLook(m: Ends, v: LookView) {
  const shown = linkVisible({ source: m.s, target: m.t }, v.nodes);
  const ends = shown && v.families.has(m.family);
  const focus = (shown && touches(m, v.selected)) || (ends && withinRoute(m, v.highlight));
  const on = focus || (ends && (v.showAll || m.bb));
  return { on, all: on && v.showAll, focus };
}

/** The look as bits, to tell whether an edge's classes change. */
const lookBits = (bb: boolean, l: ReturnType<typeof edgeLook>) =>
  (bb ? 1 : 0) | (l.on ? 0 : 2) | (l.all ? 4 : 0) | (l.focus ? 8 : 0);

export const applyEdge = (c: EdgeChange) =>
  c.e
    .toggleClass('bb', c.bb)
    .toggleClass('off', !c.on)
    .toggleClass('all', c.all)
    .toggleClass('focus', c.focus);

/** The change to one edge in a view, or null when its classes stay. */
function restyle(m: EdgeMeta, v: LookView, spine: Set<number> | null): EdgeChange | null {
  if (spine) m.bb = spine.has(m.i);
  const look = edgeLook(m, v);
  const bits = lookBits(m.bb, look);
  if (bits === m.bits && m.e.hasClass('off') === !look.on) return null;
  m.bits = bits;
  return { e: m.e, bb: m.bb, ...look };
}

/** How many visible relationships each island pair's bundle stands for (force overview only). */
function bundleCounts(p: MapParts, v: View) {
  if (v.layout !== 'force' || v.showAll) return new Map<string, number>();
  const links = p.graph.links.filter((l) => v.families.has(l.family));
  return visibleBundleCounts(links, p.clusterOf, v.nodes);
}

/** Bundles summarise the visible cross-cluster relationships in the force overview. */
function refreshBundles(p: MapParts, v: View) {
  const counts = bundleCounts(p, v);
  const top = Math.max(1, ...counts.values());
  const [aMin, aMax] = EXPLORER.edges.bundleAlpha;
  p.bundleEdges.forEach((e) => {
    const c = counts.get(pairKey(e.data('a'), e.data('b'))) ?? 0;
    const on = c >= EXPLORER.edges.minBundle;
    e.toggleClass('off', !on);
    if (on) {
      e.data('alpha', aMin + (aMax - aMin) * Math.sqrt(c / top));
      e.data('width', bundleWidth(c, top));
    }
  });
}

const edgeMeta = (p: MapParts): EdgeMeta[] =>
  p.graph.links.map((l, i) => ({
    e: p.cy.getElementById(`e${i}`) as cytoscape.EdgeSingular,
    i,
    s: l.source,
    t: l.target,
    family: l.family,
    bb: false,
    bits: -1,
  }));

/**
 * The backbone over the families switched on and the terms shown, recomputed when either
 * changes (a term whose strongest links went to hidden terms keeps a visible one); null
 * when neither did.
 */
function createSpine(graph: MapParts['graph']) {
  let spineFor: [ReadonlySet<string>, ReadonlySet<string>] | null = null;
  return (v: View) => {
    const same = spineFor?.[0] === v.families && spineFor[1] === v.nodes;
    spineFor = [v.families, v.nodes];
    return same ? null : backboneOf(graph.nodes, graph.links, v);
  };
}

/**
 * Restyle the edges for the current view. Worked out in plain data; only edges whose
 * classes change are touched, so a toggle restyles the edges it changes, not every
 * edge. `defer` hands the changes back to be applied a batch per frame.
 */
export function createEdges(p: MapParts, s: MapState) {
  const meta = edgeMeta(p);
  const spineOf = createSpine(p.graph);
  return (defer = false): EdgeChange[] => {
    const v = s.view;
    if (!v) return [];
    const spine = spineOf(v);
    const changes = meta.flatMap((m) => restyle(m, v, spine) ?? []);
    p.cy.batch(() => {
      if (!defer) changes.forEach(applyEdge);
      refreshBundles(p, v);
    });
    reshow(p, s);
    return defer ? changes : [];
  };
}

/** Bend a cross-island edge towards its islands' centres, or straighten it (no centres). */
function route(p: MapParts, e: cytoscape.EdgeSingular, centre?: Record<string, Point>) {
  if (!centre) {
    e.removeStyle('curve-style control-point-distances control-point-weights');
    return;
  }
  const islandCentre = (id: string) => centre[getOrThrow(p.byId, id, 'edge end').cluster];
  const from = islandCentre(e.data('source'));
  const to = islandCentre(e.data('target'));
  const r = bundleControls([e.source().position(), e.target().position()], [from, to]);
  e.style({
    'curve-style': 'unbundled-bezier',
    'control-point-distances': r.distances,
    'control-point-weights': r.weights,
  });
}

/**
 * Bundled routes for cross-cluster edges drawn in full ("show all", force layout).
 * `only`: just these edges (a batch of a staggered reveal), the rest already done.
 */
export function createRoutes(p: MapParts) {
  let bundled = false;
  return (on: boolean, centre?: Record<string, Point>, only?: cytoscape.EdgeCollection) => {
    // Clearing routes that were never set restyles every cross-cluster edge for nothing.
    if (!on && !bundled && !only) return;
    bundled = on && !!centre;
    p.cy.batch(() => {
      (only ?? p.links).filter('.xc').forEach((e) => route(p, e, on ? centre : undefined));
    });
  };
}

export type SetRoutes = ReturnType<typeof createRoutes>;
