/**
 * Pure logic behind the Explorer's term panel (A80): relationships derived from the
 * graph artefact, the per-term record cache, the `?term=` deep link, deep-dive
 * paragraphs, and Previous/Next + Back/Forward (A83). No Astro or zod imports — this runs
 * in the browser island.
 */
import type { Graph } from './graph-model';
import type { ExportTerm } from './export';

export type PanelRelation = { type: string; id: string };
export type PanelRelationGroup = { type: string; ids: string[] };

/**
 * Every relationship of `id`, from the graph's authored links: outgoing links keep
 * their type, incoming ones take the inverse (`requires` → `unlocks`; symmetric types
 * map to themselves). Grouped in `order`; unknown types go last; ids de-duplicated.
 */
export function relationGroups(
  graph: Graph,
  id: string,
  inverse: Record<string, string>,
  order: readonly string[],
): PanelRelationGroup[] {
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
  const rank = (t: string) => (order.includes(t) ? order.indexOf(t) : order.length);
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([type, ids]) => ({ type, ids }));
}

/** Ids directly related to `id`, in either direction — what the panel prefetches. */
export const neighbourIds = (graph: Graph, id: string): string[] => [
  ...new Set(
    graph.links.flatMap((l) => (l.source === id ? [l.target] : l.target === id ? [l.source] : [])),
  ),
];

/**
 * The term and its direct neighbours in the term-page graph's shape (Graph.tsx): the
 * links stay in their authored direction, labelled with their type.
 */
export function neighbourhoodGraph(
  graph: Graph,
  id: string,
  lang: 'en' | 'da',
  edgeLabels: Record<string, string>,
) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const links = graph.links.filter(
    (l) => (l.source === id || l.target === id) && l.source !== l.target,
  );
  const ids = [id, ...neighbourIds(graph, id)].filter((x) => byId.has(x));
  return {
    nodes: ids.map((x) => {
      const n = byId.get(x)!;
      return { id: x, label: n.term[lang], focus: x === id, domain: n.domain, cluster: n.cluster };
    }),
    edges: links
      .filter((l) => byId.has(l.source) && byId.has(l.target))
      .map((l) => ({
        source: l.source,
        target: l.target,
        type: l.type,
        family: l.family,
        label: edgeLabels[l.type] ?? l.type,
      })),
  };
}

export type TermRecord = ExportTerm;

/**
 * A memoising loader for per-term records (`/api/terms/<id>.json`): one request per
 * term, shared by prefetch and display. A failed request is forgotten, so a later
 * call retries.
 */
export function makeTermCache(fetchJson: (url: string) => Promise<unknown>, apiBase: string) {
  const cache = new Map<string, Promise<TermRecord>>();
  const done = new Map<string, TermRecord>();
  const load = (id: string): Promise<TermRecord> => {
    const hit = cache.get(id);
    if (hit) return hit;
    const p = fetchJson(`${apiBase}${id}.json`).then(
      (r) => {
        done.set(id, r as TermRecord);
        return r as TermRecord;
      },
      (err: unknown) => {
        cache.delete(id);
        throw err;
      },
    );
    cache.set(id, p);
    return p;
  };
  return {
    load,
    /** Warm the cache; errors are swallowed (the real load will retry). */
    prefetch: (id: string) => void load(id).catch(() => undefined),
    /** The record if it has already arrived — lets the panel render instantly. */
    peek: (id: string): TermRecord | undefined => done.get(id),
  };
}

/** The `?term=` deep link: the selected term id, or null. */
export const termFromSearch = (search: string): string | null =>
  new URLSearchParams(search).get('term') || null;

/**
 * `href` with `?term=` set to `id` (or removed when null); every other parameter and
 * the hash are kept. Returns a path + search + hash, ready for `history.replaceState`.
 */
export function withTermParam(href: string, id: string | null): string {
  const u = new URL(href, 'http://x.invalid');
  if (id) u.searchParams.set('term', id);
  else u.searchParams.delete('term');
  return `${u.pathname}${u.search}${u.hash}`;
}

/** Plain-text deep dive → paragraphs: split on blank lines, inner line breaks joined. */
export const paragraphs = (text: string | undefined): string[] =>
  (text ?? '')
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.replace(/\s*\r?\n\s*/g, ' ').trim())
    .filter(Boolean);

/**
 * The anchor term's connections as one list, in the order the relationships list shows
 * them (group by group). A term under two types appears twice, so a position is an index
 * into this list, never a lookup by id. Ids `known` rejects (not on the map) are skipped.
 */
export const connectionCycle = (
  groups: PanelRelationGroup[],
  known: (id: string) => boolean = () => true,
): PanelRelation[] =>
  groups.flatMap((g) => g.ids.filter(known).map((id) => ({ type: g.type, id })));

/**
 * One step through a cycle of `length`, wrapping: from the anchor itself (`index` null)
 * next is the first entry and previous the last. Null when there is nothing to step to.
 */
export function stepCycle(length: number, index: number | null, dir: 1 | -1): number | null {
  if (length <= 0) return null;
  if (index === null) return dir === 1 ? 0 : length - 1;
  return (((index + dir) % length) + length) % length;
}

/** Whose connections Previous/Next walk, and where in them the panel is (null: the anchor). */
export type CycleState = { anchor: string; index: number | null };

/**
 * How the panel arrived at a term: Previous/Next (or "return to the anchor", index
 * null), Back/Forward, or any other pick.
 */
export type Arrival = { via: 'step'; index: number | null } | { via: 'history' } | { via: 'other' };

/**
 * The cycle after the panel moves to `id`, where `cycle` is the current anchor's
 * connection list. A step keeps the anchor and records the position. Back/Forward keep
 * the anchor when they land on it or on one of its connections (so a walk survives a
 * look back); any other arrival — a node, a chip, search, or Back/Forward elsewhere —
 * anchors the cycle on the new term.
 */
export function nextCycleState(
  state: CycleState | null,
  id: string,
  arrival: Arrival,
  cycle: readonly PanelRelation[],
): CycleState {
  if (state && arrival.via === 'step') return { anchor: state.anchor, index: arrival.index };
  if (state && arrival.via === 'history') {
    if (id === state.anchor) return { anchor: id, index: null };
    const at = cycle.findIndex((c) => c.id === id);
    if (at >= 0) return { anchor: state.anchor, index: at };
  }
  return { anchor: id, index: null };
}

/** The panel's Back/Forward trail: viewed term ids and the one on screen. */
export type PanelHistory = { entries: string[]; pos: number };

/** How many viewed terms Back remembers. */
export const HISTORY_LIMIT = 50;

export const startHistory = (id: string): PanelHistory => ({ entries: [id], pos: 0 });

/** Visit `id`: the forward trail is dropped, like a browser; re-visiting the current term is a no-op. */
export function visit(h: PanelHistory, id: string, limit = HISTORY_LIMIT): PanelHistory {
  if (h.entries[h.pos] === id) return h;
  const entries = [...h.entries.slice(0, h.pos + 1), id].slice(-limit);
  return { entries, pos: entries.length - 1 };
}

/** Move `dir` through the trail: the new history and the term to show, or null at an end. */
export function travel(h: PanelHistory, dir: 1 | -1): { history: PanelHistory; id: string } | null {
  const pos = h.pos + dir;
  if (pos < 0 || pos >= h.entries.length) return null;
  return { history: { entries: h.entries, pos }, id: h.entries[pos] };
}

/** `{i} of {n} · {type}`-style text: fills `{i}` (1-based), `{n}` and `{type}` in `template`. */
export const positionText = (template: string, index: number, length: number, type: string) =>
  template
    .replace('{i}', String(index + 1))
    .replace('{n}', String(length))
    .replace('{type}', type);
