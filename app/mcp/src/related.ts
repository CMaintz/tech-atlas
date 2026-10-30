import { EDGE_TYPES, type EdgeType } from '../../src/schema';
import type { BundleLink } from './bundle';

type Step = { other: string; type: EdgeType; relation: string; direction: 'out' | 'in' };
export type Adjacency = Map<string, Step[]>;

export type Neighbour = Step & { hop: number; via: string };

export const RELATIONS = [
  ...new Set(Object.entries(EDGE_TYPES).flatMap(([type, { inverse }]) => [type, inverse])),
] as [string, ...string[]];

function push(adj: Adjacency, from: string, step: Step): void {
  adj.set(from, [...(adj.get(from) ?? []), step]);
}

export function adjacency(links: readonly BundleLink[]): Adjacency {
  const adj: Adjacency = new Map();
  for (const { source, target, type } of links) {
    push(adj, source, { other: target, type, relation: type, direction: 'out' });
    push(adj, target, { other: source, type, relation: EDGE_TYPES[type].inverse, direction: 'in' });
  }
  return adj;
}

type Walk = { depth: number; relations?: readonly string[]; max: number };
type Visit = { adj: Adjacency; walk: Walk; seen: Set<string>; found: Neighbour[] };

function expand(v: Visit, frontier: string[], hop: number): string[] {
  const next: string[] = [];
  for (const via of frontier)
    for (const step of v.adj.get(via) ?? []) {
      if (v.seen.has(step.other)) continue;
      if (v.walk.relations && !v.walk.relations.includes(step.relation)) continue;
      v.seen.add(step.other);
      v.found.push({ ...step, hop, via });
      next.push(step.other);
    }
  return next;
}

export function neighbours(adj: Adjacency, start: string, walk: Walk): Neighbour[] {
  const v: Visit = { adj, walk, seen: new Set([start]), found: [] };
  let frontier = [start];
  for (let hop = 1; hop <= walk.depth && frontier.length; hop++)
    frontier = expand(v, frontier, hop);
  return v.found.slice(0, walk.max);
}
