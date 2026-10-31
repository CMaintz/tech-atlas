import { EXPLORER } from '../explorer-config';
import type { Point } from '../graph-style';
import { pairKey } from '../graph-style/edges';
import { linkVisible } from './visibility';
import type { Link } from './types';

export { pairKey };

function countClusterPairs(
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

function relativeControls(
  s: Point,
  t: Point,
  points: Point[],
): { distances: number[]; weights: number[] } {
  const dx = t.x - s.x;
  const dy = t.y - s.y;
  const len2 = dx * dx + dy * dy || 1;
  const len = Math.sqrt(len2);
  return {
    distances: points.map((p) => ((p.x - s.x) * dy - (p.y - s.y) * dx) / len),
    weights: points.map((p) => ((p.x - s.x) * dx + (p.y - s.y) * dy) / len2),
  };
}
