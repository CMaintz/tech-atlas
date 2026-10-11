import type { Graph, GraphNode } from './graph-model';
import { SYMMETRIC } from './quiz-text';
import type { Dir } from './quiz-types';
import type { EdgeType } from '../schema';

export type Edge = { type: EdgeType; dir: Dir; other: string };
export type Relation = { type: EdgeType; dir: Dir };
export type QuizGraph = { graph: Graph; byId: Map<string, GraphNode>; edges: Map<string, Edge[]> };

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

export function nodeOf(g: QuizGraph, id: string): GraphNode {
  const node = g.byId.get(id);
  if (!node) throw new Error(`unknown term: ${id}`);
  return node;
}

export const edgesOf = (g: QuizGraph, id: string) => g.edges.get(id) ?? [];

export const ends = (g: QuizGraph, id: string, { type, dir }: Relation) => [
  ...new Set(
    edgesOf(g, id)
      .filter((e) => e.type === type && (SYMMETRIC.has(type) || e.dir === dir))
      .map((e) => e.other),
  ),
];

export const neighbours = (g: QuizGraph, id: string) => new Set(edgesOf(g, id).map((e) => e.other));

export function closure(g: QuizGraph, id: string, rel: Relation) {
  const seen = new Set<string>();
  const walk = (x: string) => {
    for (const y of ends(g, x, rel)) {
      if (seen.has(y) || y === id) continue;
      seen.add(y);
      walk(y);
    }
  };
  walk(id);
  return seen;
}

export const relatives = (g: QuizGraph, id: string) =>
  edgesOf(g, id)
    .filter((e) => ['kind-of', 'part-of', 'implements', 'alternative-to'].includes(e.type))
    .map((e) => e.other);

export const kin = (g: QuizGraph, id: string) => [
  ...relatives(g, id),
  ...edgesOf(g, id)
    .filter((e) => e.type === 'contrasts-with')
    .map((e) => e.other),
];

export const mentioned = (g: QuizGraph, id: string) => {
  const own = g.byId.get(id)?.mentions ?? [];
  return [...own, ...g.graph.nodes.filter((n) => n.mentions.includes(id)).map((n) => n.id)];
};
