import { EXPLORER } from '../explorer-config';
import type { Link } from './types';

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

export const sizeForRank = (r: number) =>
  EXPLORER.node.minSize + (EXPLORER.node.maxSize - EXPLORER.node.minSize) * Math.sqrt(r);
