import { describe, expect, it } from 'vitest';
import {
  bundleControls,
  clusterBundles,
  linkVisible,
  pairKey,
  relativeControls,
  termVisible,
  visibleBundleCounts,
} from '../graph-layout';
import { buildGraph, type ModelTerm } from '../graph-model';
import { loadTerms } from '../../../scripts/load-terms';
import { countClusterPairs } from './bundles';
import { on } from './test-fixtures';

describe('linkVisible / visibleBundleCounts: an edge needs both ends visible', () => {
  it('draws an edge only when both of its terms are visible', () => {
    expect(linkVisible({ source: 'a', target: 'b' }, on('a', 'b'))).toBe(true);
    expect(linkVisible({ source: 'a', target: 'b' }, on('a'))).toBe(false);
    expect(linkVisible({ source: 'a', target: 'b' }, on('b'))).toBe(false);
    expect(linkVisible({ source: 'a', target: 'b' }, on())).toBe(false);
  });

  // Clusters x (a1, a2), y (b1) and z (c1): x–y twice, x–z and y–z once each.
  const cluster: Record<string, string> = { a1: 'x', a2: 'x', b1: 'y', c1: 'z' };
  const links = [
    { source: 'a1', target: 'b1' },
    { source: 'a2', target: 'b1' },
    { source: 'a1', target: 'c1' },
    { source: 'b1', target: 'c1' },
    { source: 'a1', target: 'a2' },
  ];
  const counts = (visible: Set<string>) =>
    Object.fromEntries(visibleBundleCounts(links, (id) => cluster[id], visible));

  it('counts only the cross-cluster edges with both ends visible', () => {
    expect(counts(on('a1', 'a2', 'b1', 'c1'))).toEqual({
      [pairKey('x', 'y')]: 2,
      [pairKey('x', 'z')]: 1,
      [pairKey('y', 'z')]: 1,
    });
    // A partly hidden cluster thins its ribbons…
    expect(counts(on('a1', 'b1', 'c1'))[pairKey('x', 'y')]).toBe(1);
    // …and a wholly hidden one has none; the other ribbons are unchanged.
    expect(counts(on('b1', 'c1'))).toEqual({ [pairKey('y', 'z')]: 1 });
  });

  it('keys a cluster pair the same whichever way round', () => {
    expect(pairKey('x', 'y')).toBe(pairKey('y', 'x'));
  });

  it('with any one domain off, no drawn edge or ribbon touches a hidden term (real data)', () => {
    const { terms } = loadTerms();
    const graph = buildGraph([...terms.entries()].map(([id, t]) => ({ ...t, id }) as ModelTerm));
    const domains = [...new Set(graph.nodes.flatMap((n) => n.domain))];
    const clusterOf = new Map(graph.nodes.map((n) => [n.id, n.cluster]));
    expect(domains.length).toBeGreaterThan(1);
    for (const off of domains) {
      const enabled = new Set(domains.filter((d) => d !== off));
      const visible = new Set(graph.nodes.filter((n) => termVisible(n, enabled)).map((n) => n.id));
      const hidden = graph.nodes.filter((n) => !visible.has(n.id));
      expect(hidden.length, off).toBeGreaterThan(0);
      const hiddenIds = new Set(hidden.map((n) => n.id));
      for (const l of graph.links)
        if (hiddenIds.has(l.source) || hiddenIds.has(l.target))
          expect(linkVisible(l, visible)).toBe(false);
      // A cluster with no visible term keeps no ribbon.
      const bare = new Set(
        [...new Set(graph.nodes.map((n) => n.cluster))].filter(
          (c) => !graph.nodes.some((n) => n.cluster === c && visible.has(n.id)),
        ),
      );
      for (const [k, c] of visibleBundleCounts(graph.links, (id) => clusterOf.get(id), visible)) {
        expect(c).toBeGreaterThan(0);
        for (const side of k.split('\u0000')) expect(bare.has(side), `${off}: ${k}`).toBe(false);
      }
    }
  });
});

describe('countClusterPairs', () => {
  it('counts links between different known clusters, in first-seen order', () => {
    const cl: Record<string, string> = { a: 'p', b: 'q', c: 'p' };
    const counts = countClusterPairs(
      [
        { source: 'b', target: 'a' },
        { source: 'a', target: 'c' },
        { source: 'a', target: 'unknown' },
        { source: 'c', target: 'b' },
      ],
      (id) => cl[id],
    );
    expect([...counts]).toEqual([[pairKey('p', 'q'), 2]]);
  });
});

describe('clusterBundles', () => {
  it('counts relationships per cluster pair, regardless of direction', () => {
    const cl: Record<string, string> = { a: 'p', b: 'p', c: 'q', d: 'q', e: 'r' };
    const b = clusterBundles(
      [
        { source: 'a', target: 'c' },
        { source: 'd', target: 'b' },
        { source: 'a', target: 'b' },
        { source: 'a', target: 'e' },
      ],
      (id) => cl[id],
      2,
    );
    expect(b).toEqual([{ a: 'p', b: 'q', count: 2 }]);
  });
});

describe('bundle control points', () => {
  it('turns absolute points back into edge-relative weights and distances', () => {
    const r = relativeControls({ x: 0, y: 0 }, { x: 10, y: 0 }, [
      { x: 5, y: 3 },
      { x: 2.5, y: -1 },
    ]);
    expect(r.weights).toEqual([0.5, 0.25]);
    expect(Math.abs(r.distances[0])).toBeCloseTo(3);
    expect(Math.sign(r.distances[0])).toBe(-Math.sign(r.distances[1]));
  });
  it('bends an edge towards its islands’ centres by beta', () => {
    const s = { x: 0, y: 0 };
    const t = { x: 30, y: 0 };
    const straight = bundleControls(s, t, { x: 10, y: 0 }, { x: 20, y: 0 }, 0.8);
    expect(straight.distances.every((d) => Math.abs(d) < 1e-9)).toBe(true);
    const bent = bundleControls(s, t, { x: 10, y: 20 }, { x: 20, y: 20 }, 0.5);
    expect(Math.abs(bent.distances[0])).toBeCloseTo(10);
    expect(bent.weights[0]).toBeCloseTo(1 / 3);
  });
});
