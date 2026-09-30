/**
 * The derived graph, computed from authored Terms. Pure — no Astro imports — so the
 * build script and the site share one implementation (ADR-0001: derive, don't author).
 */
import type { EdgeType } from '../schema';
import { makeLinker } from './autolink';
import { bareName, collisionsOf } from './collisions';

type RawEdge = string | { to: string; strength?: string; confidence?: string };
export type ModelTerm = {
  id: string;
  term: { en: string; da: string };
  domain: string[];
  cluster: string;
  summary?: { en: string; da: string };
  /** Year the idea entered use (SPEC §4), when authored. */
  era?: number;
  aka?: { en: string[]; da: string[] };
  body?: Record<string, { en: string; da: string }>;
  edges?: Partial<Record<EdgeType, RawEdge[]>>;
};

export type Family =
  'structure' | 'dependency' | 'contrast' | 'security' | 'regulation' | 'lineage' | 'association';

export const FAMILY: Record<EdgeType, Family> = {
  'kind-of': 'structure',
  'part-of': 'structure',
  implements: 'structure',
  requires: 'dependency',
  'contrasts-with': 'contrast',
  'alternative-to': 'contrast',
  mitigates: 'security',
  exploits: 'security',
  causes: 'security',
  mandates: 'regulation',
  supersedes: 'lineage',
  'used-with': 'association',
};

export type GraphNode = {
  id: string;
  term: { en: string; da: string };
  domain: string[];
  cluster: string;
  summary?: { en: string; da: string };
  /** Year the idea entered use; absent when not authored. Drives the Time layout. */
  era?: number;
  /** Other names, per language; absent when the term has none. */
  aka?: { en: string[]; da: string[] };
  /** Longest path to this term through `requires` (ADR-0001). */
  depth: number;
  degree: number;
  /** Direct `requires` targets. */
  requires: string[];
  /** True when another domain holds a different term of the same name (ADR-0003). */
  collides: boolean;
  /** Other terms named in this term's prose — untyped, never authored (SPEC §6). */
  mentions: string[];
};
export type GraphLink = {
  source: string;
  target: string;
  type: EdgeType;
  family: Family;
  weight: number;
  /** Authored `strength: primary` (absent otherwise) — always drawn in the overview (A86). */
  primary?: true;
};
export type Graph = { nodes: GraphNode[]; links: GraphLink[] };

/** Bare refs resolve by name (preferring the source's domain); namespaced refs must match exactly. */
export function makeRefResolver(ids: string[]) {
  const all = new Set(ids);
  const byName = new Map<string, string[]>();
  for (const id of ids) {
    const name = id.split('/').pop()!;
    byName.set(name, [...(byName.get(name) ?? []), id]);
  }
  return (ref: string, fromId?: string): string | null => {
    if (all.has(ref)) return ref;
    if (ref.includes('/')) return null;
    const candidates = byName.get(ref) ?? [];
    if (candidates.length <= 1) return candidates[0] ?? null;
    const folder = fromId?.split('/')[0];
    return candidates.find((c) => c.startsWith(`${folder}/`)) ?? candidates[0];
  };
}

const FAMILY_BASE: Record<Family, number> = {
  dependency: 3,
  regulation: 2.5,
  security: 2,
  structure: 1.6,
  contrast: 1.4,
  lineage: 1.2,
  association: 1,
};
const STRENGTH: Record<string, number> = { primary: 1.6, normal: 1, minor: 0.6 };
const CONFIDENCE: Record<string, number> = { high: 1, medium: 0.8, low: 0.6 };

/** A resolved edge before endpoint degree is folded into its weight (SPEC §6). */
function rawLink(source: string, target: string, type: EdgeType, e: RawEdge): GraphLink {
  const strength = typeof e === 'string' ? 'normal' : (e.strength ?? 'normal');
  const confidence = typeof e === 'string' ? 'high' : (e.confidence ?? 'high');
  const family = FAMILY[type];
  return {
    source,
    target,
    type,
    family,
    weight: FAMILY_BASE[family] * STRENGTH[strength] * CONFIDENCE[confidence],
    ...(strength === 'primary' ? { primary: true as const } : {}),
  };
}

/** Every authored edge that resolves to another term, in authoring order. */
function resolveLinks(terms: ModelTerm[]): GraphLink[] {
  const resolve = makeRefResolver(terms.map((t) => t.id));
  const links: GraphLink[] = [];
  for (const t of terms)
    for (const [type, list] of Object.entries(t.edges ?? {}) as [EdgeType, RawEdge[]][])
      for (const e of list ?? []) {
        const target = resolve(typeof e === 'string' ? e : e.to, t.id);
        if (target && target !== t.id) links.push(rawLink(t.id, target, type, e));
      }
  return links;
}

/** How many edges touch each term, either way round. */
function degrees(links: GraphLink[]): Map<string, number> {
  const degree = new Map<string, number>();
  for (const l of links) {
    degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
    degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
  }
  return degree;
}

/** Each term's direct `requires` targets, in authoring order. */
function requiresOf(terms: ModelTerm[], links: GraphLink[]): Map<string, string[]> {
  const requires = new Map<string, string[]>(terms.map((t) => [t.id, []]));
  for (const l of links) if (l.type === 'requires') requires.get(l.source)!.push(l.target);
  return requires;
}

/** Visual weight = type family × strength × confidence × endpoint degree (SPEC §6, D13). */
function weighByDegree(links: GraphLink[], degree: Map<string, number>): void {
  for (const l of links) {
    const deg = 1 + Math.log2(1 + (degree.get(l.source) ?? 1));
    l.weight = Number((l.weight * (deg / 3 + 0.7)).toFixed(2));
  }
}

/** Depth of a term: the longest path to it through `requires` (ADR-0001), memoised. */
function depthResolver(requires: Map<string, string[]>): (id: string) => number {
  const memo = new Map<string, number>();
  const depthOf = (id: string, stack = new Set<string>()): number => {
    if (memo.has(id)) return memo.get(id)!;
    if (stack.has(id)) return 0; // cycles are a lint error (E4); never loop here
    stack.add(id);
    const reqs = requires.get(id) ?? [];
    const d = reqs.length ? 1 + Math.max(...reqs.map((r) => depthOf(r, stack))) : 0;
    stack.delete(id);
    memo.set(id, d);
    return d;
  };
  return (id) => depthOf(id);
}

export function buildGraph(terms: ModelTerm[]): Graph {
  const links = resolveLinks(terms);
  const degree = degrees(links);
  const requires = requiresOf(terms, links);
  weighByDegree(links, degree);
  const collisions = collisionsOf(terms.map((t) => t.id));
  const linker = makeLinker(terms, 'en');
  const depthOf = depthResolver(requires);
  const nodes = terms.map((t) => ({
    id: t.id,
    term: t.term,
    domain: t.domain,
    cluster: t.cluster,
    summary: t.summary,
    era: t.era,
    // Aliases only when a term has some: the Explorer's "Find a term" matches them (A95).
    ...(t.aka && (t.aka.en.length || t.aka.da.length) ? { aka: t.aka } : {}),
    depth: depthOf(t.id),
    degree: degree.get(t.id) ?? 0,
    requires: requires.get(t.id) ?? [],
    collides: collisions.has(bareName(t.id)),
    mentions: linker.mentions(
      [t.summary?.en ?? '', ...Object.values(t.body ?? {}).map((f) => f.en)],
      t.id,
    ),
  }));
  return { nodes, links };
}

/** Every transitive prerequisite of a term, foundations first. */
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
    .map((x) => byId.get(x)!)
    .sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));
}

/** Shortest route between two terms, treating every relationship as a two-way road. */
export function shortestPath(graph: Graph, from: string, to: string): string[] | null {
  const prev = breadthFirst(undirectedAdjacency(graph.links), from, to);
  if (!prev.has(to)) return null;
  const path: string[] = [];
  for (let at: string | null = to; at; at = prev.get(at) ?? null) path.unshift(at);
  return path;
}

/** Each term's neighbours, every relationship counted both ways. */
function undirectedAdjacency(links: GraphLink[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const l of links) {
    adj.set(l.source, [...(adj.get(l.source) ?? []), l.target]);
    adj.set(l.target, [...(adj.get(l.target) ?? []), l.source]);
  }
  return adj;
}

/**
 * Breadth-first search from `from`, stopping once `to` is reached: the term each
 * visited term was first reached from (`null` for `from` itself).
 */
function breadthFirst(
  adj: Map<string, string[]>,
  from: string,
  to: string,
): Map<string, string | null> {
  const prev = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === to) break;
    for (const next of adj.get(cur) ?? []) {
      if (prev.has(next)) continue;
      prev.set(next, cur);
      queue.push(next);
    }
  }
  return prev;
}
