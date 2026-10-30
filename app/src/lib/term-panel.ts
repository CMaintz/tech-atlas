import type { Graph, GraphLink, GraphNode } from './graph-model';
import type { ExportEdge, ExportTerm } from './export';
import { getOrThrow } from './map-get';

export const FACETS = ['formal', 'plain', 'inPractice', 'whyItMatters'] as const;
export type Facet = (typeof FACETS)[number];

export type PanelRelation = { type: string; id: string };
export type PanelRelationGroup = { type: string; ids: string[] };

type RelationVocabulary = { inverse: Record<string, string>; order: readonly string[] };

export function relationGroups(
  graph: Graph,
  id: string,
  { inverse, order }: RelationVocabulary,
): PanelRelationGroup[] {
  const groups = idsByRelationType(graph, id, inverse);
  const rank = (t: string) => (order.includes(t) ? order.indexOf(t) : order.length);
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([type, ids]) => ({ type, ids }));
}

function idsByRelationType(graph: Graph, id: string, inverse: Record<string, string>) {
  const groups = new Map<string, string[]>();
  const add = (type: string, other: string) => {
    const list = groups.get(type) ?? [];
    if (!list.includes(other)) list.push(other);
    groups.set(type, list);
  };
  for (const l of graph.links) {
    if (l.source === id && l.target !== id) add(l.type, l.target);
    else if (l.target === id && l.source !== id) add(inverse[l.type] ?? l.type, l.source);
  }
  return groups;
}

export const neighbourIds = (graph: Graph, id: string): string[] => [
  ...new Set(
    graph.links.flatMap((l) => (l.source === id ? [l.target] : l.target === id ? [l.source] : [])),
  ),
];

type MiniWording = { lang: 'en' | 'da'; edgeLabels: Record<string, string> };

export function neighbourhoodGraph(graph: Graph, id: string, { lang, edgeLabels }: MiniWording) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const links = graph.links.filter(
    (l) => (l.source === id || l.target === id) && l.source !== l.target,
  );
  const ids = [id, ...neighbourIds(graph, id)].filter((x) => byId.has(x));
  return {
    nodes: ids.map((x) => miniNode(getOrThrow(byId, x, 'neighbourhood node'), x === id, lang)),
    edges: links
      .filter((l) => byId.has(l.source) && byId.has(l.target))
      .map((l) => miniEdge(l, edgeLabels)),
  };
}

const miniNode = (n: GraphNode, focus: boolean, lang: 'en' | 'da') => ({
  id: n.id,
  label: n.term[lang],
  focus,
  domain: n.domain,
  cluster: n.cluster,
});

const miniEdge = (l: GraphLink, edgeLabels: Record<string, string>) => ({
  source: l.source,
  target: l.target,
  type: l.type,
  family: l.family,
  label: edgeLabels[l.type] ?? l.type,
});

export type TermRecord = ExportTerm;

export const relationReasons = (edges: readonly ExportEdge[]) =>
  new Map<string, NonNullable<ExportEdge['why']>>(
    edges.flatMap((e) => (e.why ? [[`${e.type}|${e.to}`, e.why]] : [])),
  );

type FetchJson = (url: string) => Promise<unknown>;

export function makeTermCache(fetchJson: FetchJson, apiBase: string) {
  const cache = new Map<string, Promise<TermRecord>>();
  const done = new Map<string, TermRecord>();
  const load = (id: string): Promise<TermRecord> => {
    const hit = cache.get(id);
    if (hit) return hit;
    const p = rememberOrForget(fetchJson(`${apiBase}${id}.json`), { id, cache, done });
    cache.set(id, p);
    return p;
  };
  return {
    load,
    prefetch: (id: string) => void load(id).catch(() => undefined),
    peek: (id: string): TermRecord | undefined => done.get(id),
  };
}

type RecordStores = {
  id: string;
  cache: Map<string, Promise<TermRecord>>;
  done: Map<string, TermRecord>;
};

const rememberOrForget = (request: Promise<unknown>, { id, cache, done }: RecordStores) =>
  request.then(
    (r) => {
      done.set(id, r as TermRecord);
      return r as TermRecord;
    },
    (err: unknown) => {
      cache.delete(id);
      throw err;
    },
  );

export const termFromSearch = (search: string): string | null =>
  new URLSearchParams(search).get('term') || null;

export function withTermParam(href: string, id: string | null): string {
  const u = new URL(href, 'http://x.invalid');
  if (id) u.searchParams.set('term', id);
  else u.searchParams.delete('term');
  return `${u.pathname}${u.search}${u.hash}`;
}

export const paragraphs = (text: string | undefined): string[] =>
  (text ?? '')
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.replace(/\s*\r?\n\s*/g, ' ').trim())
    .filter(Boolean);

export function guidesFor<G extends { lang?: 'en' | 'da' }>(
  guides: readonly G[],
  lang: 'en' | 'da',
): (G & { other: boolean })[] {
  const marked = guides.map((g) => ({ ...g, other: (g.lang ?? 'en') !== lang }));
  return [...marked.filter((g) => !g.other), ...marked.filter((g) => g.other)];
}
