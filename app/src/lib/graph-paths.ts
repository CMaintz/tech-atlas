import type { Graph, GraphLink, GraphNode } from './graph-model';
import { getOrThrow } from './map-get';

export function prerequisitesOf(graph: Graph, id: string): GraphNode[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  const walk = (x: string) => {
    for (const r of byId.get(x)?.requires ?? []) {
      if (seen.has(r)) continue;
      seen.add(r);
      walk(r);
    }
  };
  walk(id);
  return [...seen]
    .map((x) => getOrThrow(byId, x, 'prerequisite'))
    .sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));
}

export function shortestPath(graph: Graph, from: string, to: string): string[] | null {
  const prev = breadthFirstPredecessors(undirectedAdjacency(graph.links), from, to);
  if (!prev.has(to)) return null;
  const path: string[] = [];
  for (let at: string | null = to; at; at = prev.get(at) ?? null) path.unshift(at);
  return path;
}

function undirectedAdjacency(links: GraphLink[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const l of links) {
    adj.set(l.source, [...(adj.get(l.source) ?? []), l.target]);
    adj.set(l.target, [...(adj.get(l.target) ?? []), l.source]);
  }
  return adj;
}

function breadthFirstPredecessors(
  adj: Map<string, string[]>,
  from: string,
  to: string,
): Map<string, string | null> {
  const prev = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  for (let cur = queue.shift(); cur !== undefined; cur = queue.shift()) {
    if (cur === to) break;
    for (const next of adj.get(cur) ?? []) {
      if (prev.has(next)) continue;
      prev.set(next, cur);
      queue.push(next);
    }
  }
  return prev;
}
