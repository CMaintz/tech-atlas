import cytoscape from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EdgeType } from '../../schema';
import { EXPLORER } from '../explorer-config';
import { FAMILY, type Graph, type GraphNode } from '../graph-model';
import { createApply, type ApplyDeps } from './apply';
import type { MapParts, MapState } from './context';
import { createEdges, createRoutes } from './edges';
import { mapElements } from './elements';
import { createStagger } from './stagger';
import { mapStylesheet } from './style';
import type { View } from './types';

const term = (id: string, cluster: string): GraphNode => ({
  id,
  term: { en: id, da: id },
  domain: ['cs'],
  cluster,
  depth: 0,
  degree: 0,
  requires: [],
  collides: false,
  mentions: [],
});

/**
 * Two families, each with enough edges that switching it off changes a batch per frame,
 * over two islands so some edges cross between them (bundled routes bend those).
 */
function twoFamilies(): Graph {
  const n = 40;
  const nodes = Array.from({ length: n }, (_, i) => term(`t${i}`, i % 2 ? 'a' : 'b'));
  const links = (['requires', 'mitigates'] as EdgeType[]).flatMap((type, k) =>
    Array.from({ length: EXPLORER.motion.revealBatch + 10 }, (_, i) => ({
      source: `t${i % n}`,
      target: `t${(i + 1 + k + Math.floor(i / n)) % n}`,
      type,
      family: FAMILY[type],
      weight: 1,
    })),
  );
  return { nodes, links };
}

const headlessCy = (graph: Graph) =>
  cytoscape({
    headless: true,
    // Without style Cytoscape runs no animations, so the families' fade never ends.
    styleEnabled: true,
    elements: mapElements(graph, 'en', 'dark'),
    style: mapStylesheet('dark'),
  });

/** The map's parts, without the island anchors and bundles (not drawn here). */
function partsOf(cy: cytoscape.Core, graph: Graph) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  return {
    cy,
    opts: { lang: 'en', reserveRight: () => 0, centreReserve: () => 0 },
    graph,
    byId,
    clusterOf: (id: string) => byId.get(id)?.cluster,
    terms: cy.nodes('[size]'),
    links: cy.edges().not('.bundle'),
    bundleEdges: cy.collection(),
  } as unknown as MapParts;
}

const freshState = (cy: cytoscape.Core): MapState => ({
  theme: 'dark',
  view: null,
  hovered: null,
  shown: cy.collection(),
  moving: false,
  centreNow: { a: { x: -100, y: 0 }, b: { x: 100, y: 0 } },
});

/** The 2D map's apply on a headless instance, with the real edges and stagger. */
function headlessApply(graph: Graph) {
  const cy = headlessCy(graph);
  const p = partsOf(cy, graph);
  const s = freshState(cy);
  const noop = () => {};
  const reculls: boolean[] = [];
  const d = {
    refreshEdges: createEdges(p, s),
    routes: createRoutes(p),
    stagger: createStagger(cy),
    place: noop,
    hover: { unhover: noop },
    recull: (force = false) => void reculls.push(force),
    paintNames: noop,
  } as unknown as ApplyDeps;
  return { cy, reculls, apply: createApply(p, s, d) };
}

const showAll = (graph: Graph, families: string[]): View => ({
  layout: 'depth',
  nodes: new Set(graph.nodes.map((n) => n.id)),
  domains: new Set(['cs']),
  families: new Set(families),
  showAll: true,
  selected: null,
  highlight: new Set(),
  colour: () => '#888',
  bands: () => [],
});

const graph = twoFamilies();
const both = showAll(graph, ['dependency', 'security']);
const FRAME = 17;

const familySize = (family: string) => graph.links.filter((l) => l.family === family).length;
/** Edges of a family drawn now (`e<index>` is the graph's link at that index). */
const shown = (cy: cytoscape.Core, family: string) =>
  cy
    .edges()
    .not('.bundle, .off')
    .filter((e) => graph.links[Number(e.id().slice(1))].family === family).length;

/** Cross-island edges drawn bent into bundled routes (their classes draw them straight). */
const bundled = (cy: cytoscape.Core) =>
  cy
    .edges('.xc')
    .filter('.bb, .all, .focus')
    .filter((e) => e.style('curve-style') === 'unbundled-bezier').length;

describe('createApply', () => {
  beforeEach(() => {
    // Node has no animation frames: a frame is a timer, so fake time drives both the
    // stagger and Cytoscape's own animation loop (a 1000/60 ms timer in Node).
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) =>
      setTimeout(() => f(Date.now()), FRAME),
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('switches a faded family off a batch per frame', () => {
    const { cy, apply } = headlessApply(graph);
    apply(both);
    apply({ ...both, families: new Set(['security']) });
    const counts: number[] = [];
    for (let t = 0; t < EXPLORER.motion.fadeMs * 2; t += FRAME) {
      vi.advanceTimersByTime(FRAME);
      counts.push(shown(cy, 'dependency'));
    }
    const all = familySize('dependency');
    expect(counts.some((n) => n > 0 && n < all)).toBe(true);
    expect(shown(cy, 'dependency')).toBe(0);
  });

  it('switches two families off in one fade window, then takes another change', () => {
    const { cy, apply } = headlessApply(graph);
    apply(both);
    apply({ ...both, families: new Set(['security']) });
    vi.advanceTimersByTime(FRAME);
    apply({ ...both, families: new Set() });
    // Both fades have ended and their edges are switching off.
    vi.advanceTimersByTime(EXPLORER.motion.fadeMs + 3 * FRAME);
    apply({ ...both, families: new Set(['dependency']) });
    vi.advanceTimersByTime(EXPLORER.motion.fadeMs * 10);
    expect(shown(cy, 'security')).toBe(0);
    expect(shown(cy, 'dependency')).toBe(familySize('dependency'));
  });

  it('paints the newest route once a fade started for an older one ends', () => {
    const { cy, apply } = headlessApply(graph);
    const security = new Set(['security']);
    apply(both);
    apply({ ...both, families: security, highlight: new Set(['t5']) });
    vi.advanceTimersByTime(FRAME);
    apply({ ...both, families: security, highlight: new Set(['t9']) });
    vi.advanceTimersByTime(EXPLORER.motion.fadeMs * 10);
    const lit = cy.nodes('.hl').map((n) => n.id());
    expect(lit).toEqual(['t9']);
  });

  describe('a fade that ends after a newer view', () => {
    const security = new Set(['security']);
    // Many dependency links cross between the two islands, so routes bend them.
    const dependency = new Set(['dependency']);
    // The route keeps a few security links drawn in the overview, to fade.
    const overview: View = {
      ...both,
      layout: 'force',
      showAll: false,
      highlight: new Set(['t0', 't2', 't4']),
    };

    it('keeps routes off when "show all" was turned off again', () => {
      const { cy, apply } = headlessApply(graph);
      apply(overview);
      apply({ ...overview, families: dependency, showAll: true });
      vi.advanceTimersByTime(FRAME);
      apply({ ...overview, families: dependency });
      vi.advanceTimersByTime(EXPLORER.motion.fadeMs * 10);
      expect(bundled(cy)).toBe(0);
    });

    it('still bundles routes for "show all" the newer view kept', () => {
      const { cy, apply } = headlessApply(graph);
      apply(overview);
      apply({ ...overview, families: dependency, showAll: true });
      vi.advanceTimersByTime(FRAME);
      apply({ ...overview, families: dependency, showAll: true, selected: 't3' });
      vi.advanceTimersByTime(EXPLORER.motion.fadeMs * 10);
      expect(bundled(cy)).toBeGreaterThan(0);
    });

    it('leaves framing a filter to the filter', () => {
      const { reculls, apply } = headlessApply(graph);
      apply(both);
      apply({ ...both, families: security });
      vi.advanceTimersByTime(FRAME);
      apply({ ...both, families: security, nodes: new Set(['t0', 't1', 't2']) });
      vi.advanceTimersByTime(EXPLORER.motion.fadeMs * 10);
      expect(reculls).toEqual([true]);
    });
  });
});
