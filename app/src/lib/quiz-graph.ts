/**
 * The graph as the quiz reads it: each term's edges seen from that term, and the
 * sets of terms that also count as right (or as related) for a question about it.
 * Pure and deterministic.
 */
import type { Graph, GraphNode } from './graph-model';
import { SYMMETRIC } from './quiz-text';
import type { Dir } from './quiz-types';
import type { EdgeType } from '../schema';

/** One edge seen from a term: its type, direction and the term at the other end. */
export type Edge = { type: EdgeType; dir: Dir; other: string };
export type QuizGraph = { graph: Graph; byId: Map<string, GraphNode>; edges: Map<string, Edge[]> };

/** Index `graph` by term; self-loops are ignored. */
export function indexGraph(graph: Graph): QuizGraph {
  const edges = new Map<string, Edge[]>();
  const add = (id: string, e: Edge) => edges.set(id, [...(edges.get(id) ?? []), e]);
  for (const l of graph.links) {
    if (l.source === l.target) continue;
    add(l.source, { type: l.type, dir: 'out', other: l.target });
    add(l.target, { type: l.type, dir: 'in', other: l.source });
  }
  return { graph, byId: new Map(graph.nodes.map((n) => [n.id, n])), edges };
}

export const edgesOf = (g: QuizGraph, id: string) => g.edges.get(id) ?? [];

/** Endpoints of `type` edges from `id` in `dir` (both directions for symmetric types). */
export const ends = (g: QuizGraph, id: string, type: EdgeType, dir: Dir) => [
  ...new Set(
    edgesOf(g, id)
      .filter((e) => e.type === type && (SYMMETRIC.has(type) || e.dir === dir))
      .map((e) => e.other),
  ),
];

export const neighbours = (g: QuizGraph, id: string) => new Set(edgesOf(g, id).map((e) => e.other));

/** Everything reachable through `type` edges in `dir` — every term that is also a right answer. */
export function closure(g: QuizGraph, id: string, type: EdgeType, dir: Dir) {
  const seen = new Set<string>();
  const walk = (x: string) => {
    for (const y of ends(g, x, type, dir)) {
      if (seen.has(y) || y === id) continue;
      seen.add(y);
      walk(y);
    }
  };
  walk(id);
  return seen;
}

/** Structural relatives (kind of / part of / implements) and alternatives, either direction. */
export const relatives = (g: QuizGraph, id: string) =>
  edgesOf(g, id)
    .filter((e) => ['kind-of', 'part-of', 'implements', 'alternative-to'].includes(e.type))
    .map((e) => e.other);

/** Relatives plus terms it is easily confused with: close enough to also seem right. */
export const kin = (g: QuizGraph, id: string) => [
  ...relatives(g, id),
  ...edgesOf(g, id)
    .filter((e) => e.type === 'contrasts-with')
    .map((e) => e.other),
];

/** Named in each other's prose: a learner would fairly call these related. */
export const mentioned = (g: QuizGraph, id: string) => {
  const own = g.byId.get(id)?.mentions ?? [];
  return [...own, ...g.graph.nodes.filter((n) => n.mentions.includes(id)).map((n) => n.id)];
};
