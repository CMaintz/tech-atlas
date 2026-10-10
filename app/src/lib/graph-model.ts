import type { EdgeType } from '../schema';
import { makeLinker } from './autolink';
import { bareName, collisionsOf } from './collisions';
import { getOrThrow } from './map-get';

export { prerequisitesOf, shortestPath } from './graph-paths';

type RawEdge = string | { to: string; strength?: string; confidence?: string };
type TermIdentity = {
  id: string;
  term: { en: string; da: string };
  domain: string[];
  cluster: string;
  summary?: { en: string; da: string };
  era?: number;
  aka?: { en: string[]; da: string[] };
};

export type ModelTerm = TermIdentity & {
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

export type GraphNode = TermIdentity & {
  depth: number;
  degree: number;
  requires: string[];
  collides: boolean;
  mentions: string[];
};
export type GraphLink = {
  source: string;
  target: string;
  type: EdgeType;
  family: Family;
  weight: number;
  primary?: true;
};
export type Graph = { nodes: GraphNode[]; links: GraphLink[] };

export function makeRefResolver(ids: string[]) {
  const all = new Set(ids);
  const byName = new Map<string, string[]>();
  for (const id of ids) {
    const name = bareName(id);
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

type LinkEnds = Pick<GraphLink, 'source' | 'target' | 'type'>;

function unweighedLink({ source, target, type }: LinkEnds, e: RawEdge): GraphLink {
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

function resolveLinks(terms: ModelTerm[]): GraphLink[] {
  const resolve = makeRefResolver(terms.map((t) => t.id));
  const links: GraphLink[] = [];
  for (const t of terms)
    for (const [type, list] of Object.entries(t.edges ?? {}) as [EdgeType, RawEdge[]][])
      for (const e of list ?? []) {
        const target = resolve(typeof e === 'string' ? e : e.to, t.id);
        if (target && target !== t.id) links.push(unweighedLink({ source: t.id, target, type }, e));
      }
  return links;
}

function degrees(links: GraphLink[]): Map<string, number> {
  const degree = new Map<string, number>();
  for (const l of links) {
    degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
    degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
  }
  return degree;
}

function requiresOf(terms: ModelTerm[], links: GraphLink[]): Map<string, string[]> {
  const requires = new Map<string, string[]>(terms.map((t) => [t.id, []]));
  for (const l of links)
    if (l.type === 'requires') getOrThrow(requires, l.source, 'requires source').push(l.target);
  return requires;
}

function weighByDegree(links: GraphLink[], degree: Map<string, number>): void {
  for (const l of links) {
    const deg = 1 + Math.log2(1 + (degree.get(l.source) ?? 1));
    l.weight = Number((l.weight * (deg / 3 + 0.7)).toFixed(2));
  }
}

function depthResolver(requires: Map<string, string[]>): (id: string) => number {
  const memo = new Map<string, number>();
  const depthOf = (id: string, stack = new Set<string>()): number => {
    const known = memo.get(id);
    if (known !== undefined) return known;
    if (stack.has(id)) return 0;
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
  const derived: Derived = {
    degree,
    requires,
    collisions: collisionsOf(terms.map((t) => t.id)),
    linker: makeLinker(terms, 'en'),
    depthOf: depthResolver(requires),
  };
  return { nodes: terms.map((t) => toNode(t, derived)), links };
}

type Derived = {
  degree: Map<string, number>;
  requires: Map<string, string[]>;
  collisions: Map<string, string[]>;
  linker: ReturnType<typeof makeLinker>;
  depthOf: (id: string) => number;
};

function toNode(t: ModelTerm, d: Derived): GraphNode {
  return {
    id: t.id,
    term: t.term,
    domain: t.domain,
    cluster: t.cluster,
    summary: t.summary,
    era: t.era,
    ...(t.aka && (t.aka.en.length || t.aka.da.length) ? { aka: t.aka } : {}),
    depth: d.depthOf(t.id),
    degree: d.degree.get(t.id) ?? 0,
    requires: d.requires.get(t.id) ?? [],
    collides: d.collisions.has(bareName(t.id)),
    mentions: proseMentions(t, d.linker),
  };
}

const proseMentions = (t: ModelTerm, linker: Derived['linker']) =>
  linker.mentions([t.summary?.en ?? '', ...Object.values(t.body ?? {}).map((f) => f.en)], t.id);
