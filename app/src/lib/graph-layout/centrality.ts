/** Node importance: PageRank over the relationships, and the size it gives a term. */
import { EXPLORER } from '../explorer-config';
import type { Link } from './types';

/**
 * Each term's outgoing neighbours, by index into `ids`: the authored direction, plus
 * the reverse for a symmetric (`directed: false`) relationship. Unknown ends are skipped.
 */
export function outNeighbours(ids: string[], links: (Link & { directed?: boolean })[]) {
  const index = new Map(ids.map((id, i) => [id, i]));
  const out: number[][] = ids.map(() => []);
  for (const l of links) {
    const a = index.get(l.source);
    const b = index.get(l.target);
    if (a === undefined || b === undefined) continue;
    out[a].push(b);
    if (l.directed === false) out[b].push(a);
  }
  return out;
}

/** One PageRank iteration; rank held by terms with no links is spread over everyone. */
function rankStep(rank: number[], out: number[][], damping: number): number[] {
  const n = rank.length;
  const next = new Array(n).fill((1 - damping) / n);
  let dangling = 0;
  for (let i = 0; i < n; i++) {
    if (!out[i].length) dangling += rank[i];
    else for (const j of out[i]) next[j] += (damping * rank[i]) / out[i].length;
  }
  for (let i = 0; i < n; i++) next[i] += (damping * dangling) / n;
  return next;
}

/**
 * PageRank over the relationships (authored direction; symmetric types count both
 * ways), normalised so the top term is 1. Terms that many others build on rank high.
 */
export function pageRank(
  ids: string[],
  links: (Link & { directed?: boolean })[],
  { damping = 0.85, iterations = 40 } = {},
): Map<string, number> {
  const out = outNeighbours(ids, links);
  let rank = new Array(ids.length).fill(1 / Math.max(1, ids.length));
  for (let it = 0; it < iterations; it++) rank = rankStep(rank, out, damping);
  const max = Math.max(...rank, 1e-12);
  return new Map(ids.map((id, i) => [id, rank[i] / max]));
}

/** On-screen size for a normalised rank: √ so the long tail stays visible. */
export const sizeForRank = (r: number) =>
  EXPLORER.node.minSize + (EXPLORER.node.maxSize - EXPLORER.node.minSize) * Math.sqrt(r);
