/** Cluster-to-cluster bundles: ribbon counts and bundled edge control points. */
import { EXPLORER } from '../explorer-config';
import type { Point } from '../graph-style';
import { pairKey } from '../graph-style/edges';
import { linkVisible } from './visibility';
import type { Link } from './types';

export { pairKey };

/** How many links join each pair of different clusters, keyed by `pairKey`. */
export function countClusterPairs(
  links: Link[],
  clusterOf: (id: string) => string | undefined,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const l of links) {
    const a = clusterOf(l.source);
    const b = clusterOf(l.target);
    if (!a || !b || a === b) continue;
    const k = pairKey(a, b);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

/**
 * How many relationships a cross-cluster ribbon stands for, per cluster pair: only
 * edges with both ends visible count, so a ribbon thins as a cluster's terms hide and
 * is gone once all of one side is hidden.
 */
export function visibleBundleCounts(
  links: Link[],
  clusterOf: (id: string) => string | undefined,
  visible: ReadonlySet<string>,
): Map<string, number> {
  return countClusterPairs(
    links.filter((l) => linkVisible(l, visible)),
    clusterOf,
  );
}

/** Relationships between each pair of clusters, as one bundle per pair (a < b). */
export function clusterBundles(
  links: Link[],
  clusterOf: (id: string) => string | undefined,
  min: number = EXPLORER.edges.minBundle,
): { a: string; b: string; count: number }[] {
  return [...countClusterPairs(links, clusterOf).entries()]
    .filter(([, c]) => c >= min)
    .sort(([x], [y]) => (x < y ? -1 : 1))
    .map(([k, count]) => {
      const [a, b] = k.split('\u0000');
      return { a, b, count };
    });
}

/**
 * Hierarchical edge bundling, lite: an edge between two islands bends through points
 * pulled (by `beta`) towards each island's centre, so edges between the same islands
 * share a path. Returned as Cytoscape `unbundled-bezier` control points: distances
 * perpendicular to the edge and weights along it.
 */
export function bundleControls(
  s: Point,
  t: Point,
  cs: Point,
  ct: Point,
  beta: number = EXPLORER.edges.bundleBeta,
): { distances: number[]; weights: number[] } {
  const along = (k: number) => ({ x: s.x + (t.x - s.x) * k, y: s.y + (t.y - s.y) * k });
  const pull = (p: Point, c: Point) => ({
    x: c.x * beta + p.x * (1 - beta),
    y: c.y * beta + p.y * (1 - beta),
  });
  return relativeControls(s, t, [pull(along(1 / 3), cs), pull(along(2 / 3), ct)]);
}

/** Absolute control points → Cytoscape's edge-relative distances and weights. */
export function relativeControls(
  s: Point,
  t: Point,
  points: Point[],
): { distances: number[]; weights: number[] } {
  const dx = t.x - s.x;
  const dy = t.y - s.y;
  const len2 = dx * dx + dy * dy || 1;
  const len = Math.sqrt(len2);
  return {
    // Cytoscape measures distance to the right of the source → target direction.
    distances: points.map((p) => ((p.x - s.x) * dy - (p.y - s.y) * dx) / len),
    weights: points.map((p) => ((p.x - s.x) * dx + (p.y - s.y) * dy) / len2),
  };
}
