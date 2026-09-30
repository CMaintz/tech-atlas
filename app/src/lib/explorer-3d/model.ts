/**
 * The 3D map's fixed model (A86), computed once: where every term sits (the galaxy
 * layout, spread so no two terms crowd), how big it is (by PageRank), who its
 * neighbours are, which terms carry hub labels and where each domain's name goes.
 * Pure: no three.js, no DOM.
 */
import type { Graph, GraphNode } from '../graph-model';
import { EXPLORER } from '../explorer-config';
import { homeDomain, isDirected } from '../graph-style';
import { galaxyLayout, pageRank, separate, type Point3 } from '../graph-layout';
import type { Link3, Node3 } from './types';

// 3d-force-graph swaps link endpoints for node objects once it has run.
export const endId = (x: unknown) => (typeof x === 'string' ? x : (x as { id: string }).id);

export type Model = {
  nodes: Node3[];
  links: Link3[];
  byId: Map<string, Node3>;
  /** Each term's neighbourhood: itself and every term one relationship away. */
  neighbours: Map<string, Set<string>>;
  rank: Map<string, number>;
  /** A term's sphere radius, by its PageRank. */
  radius: (n: GraphNode) => number;
};

export function rankOf(graph: Graph) {
  return pageRank(
    graph.nodes.map((n) => n.id),
    graph.links.map((l) => ({ ...l, directed: isDirected(l.type) })),
  );
}

export const radiusBy =
  (rank: Map<string, number>) =>
  (n: GraphNode): number =>
    EXPLORER.three.nodeRel * (1.2 + 5 * Math.sqrt(rank.get(n.id) ?? 0));

/** The galaxy layout, spread: no two terms closer than a click target and a label (A86). */
export function placeTerms(graph: Graph, radius: (n: GraphNode) => number) {
  const pos = galaxyLayout(graph.nodes, graph.links);
  const pts: Point3[] = graph.nodes.map((n) => ({ ...pos.get(n.id)! }));
  const r = graph.nodes.map(radius);
  const { factor } = EXPLORER.spacing;
  const clearance = EXPLORER.three.labelClearance;
  separate(pts, (i, j) => (factor * (r[i] + r[j])) / 2 + clearance, 60);
  graph.nodes.forEach((n, i) => pos.set(n.id, pts[i]));
  return pos;
}

export function neighbourSets(nodes: readonly { id: string }[], links: readonly Link3[]) {
  const neighbours = new Map<string, Set<string>>(nodes.map((n) => [n.id, new Set([n.id])]));
  for (const l of links) {
    neighbours.get(l.source)?.add(l.target);
    neighbours.get(l.target)?.add(l.source);
  }
  return neighbours;
}

export function buildModel(graph: Graph): Model {
  const rank = rankOf(graph);
  const radius = radiusBy(rank);
  const pos = placeTerms(graph, radius);
  const nodes: Node3[] = graph.nodes.map((n) => {
    const p = pos.get(n.id)!;
    return { ...n, x: p.x, y: p.y, z: p.z, fx: p.x, fy: p.y, fz: p.z };
  });
  const links: Link3[] = graph.links.map((l, i) => ({ ...l, i, bb: false }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return { nodes, links, byId, neighbours: neighbourSets(nodes, links), rank, radius };
}

/** The most central terms, most central first: they carry text labels. */
export const hubsOf = <N extends { id: string }>(
  nodes: readonly N[],
  rank: Map<string, number>,
  count: number,
) => [...nodes].sort((a, b) => (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0)).slice(0, count);

export type DomainGroup = {
  domain: string;
  ids: string[];
  /** The galaxy's centre across the ground, and its highest term. */
  x: number;
  z: number;
  top: number;
};

/** Each domain's own terms, in first-seen order, with where its name goes. */
export function domainGroups(nodes: readonly Node3[]): DomainGroup[] {
  return [...new Set(nodes.map(homeDomain))].map((domain) => {
    const own = nodes.filter((n) => homeDomain(n) === domain);
    const mid = (k: 'x' | 'z') => own.reduce((s, n) => s + n[k], 0) / own.length;
    const top = Math.max(...own.map((n) => n.y));
    return { domain, ids: own.map((n) => n.id), x: mid('x'), z: mid('z'), top };
  });
}
