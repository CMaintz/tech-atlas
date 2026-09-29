/**
 * What the full-map Explorer shows (SPEC §7, A86), as pure functions of its controls:
 * the visible terms and links, a term's knowledge colour, the layout note under the bar,
 * a route's label and where the hover card sits. The island (Explorer.tsx) only wires
 * these to state; they are unit-tested here.
 */
import type { Graph, GraphLink, GraphNode } from './graph-model';
import { MAP_INK, homeDomain, type MapTheme } from './graph-style';
import { effectiveHome, termVisible } from './graph-layout';
import type { TermState } from './learner';
import type { Layout } from './explorer-2d';

export type Mode = '2d' | '3d';

/** Personal knowledge map colours (SPEC §9): what you know, and what you don't. */
export const KNOWLEDGE_COLOURS: Record<MapTheme, Record<string, string>> = {
  dark: {
    know: '#22c55e',
    familiar: '#84cc16',
    learning: '#f59e0b',
    unknown: '#ef4444',
  },
  // Deeper shades for the cream map (3:1 or more on it).
  light: { know: '#15803d', familiar: '#4d7c0f', learning: '#b45309', unknown: '#b91c1c' },
};

/** A copy of `set` with `key` flipped in or out. */
export function toggled(set: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

/** Terms within `hops` links of `start`, walking only links between terms in `ids`. */
export function neighbourhood(
  links: GraphLink[],
  ids: ReadonlySet<string>,
  start: string,
  hops: number,
): Set<string> {
  const near = new Set([start]);
  let frontier = new Set([start]);
  for (let h = 0; h < hops; h++) {
    frontier = nextRing(links, ids, frontier, near);
    for (const id of frontier) near.add(id);
  }
  return near;
}

/** Terms one link beyond `frontier` and not yet `near`, over links between `ids`. */
function nextRing(
  links: GraphLink[],
  ids: ReadonlySet<string>,
  frontier: ReadonlySet<string>,
  near: ReadonlySet<string>,
): Set<string> {
  const next = new Set<string>();
  for (const l of links) {
    // A selected term shows all its relationships, so its neighbourhood ignores the types.
    if (!ids.has(l.source) || !ids.has(l.target)) continue;
    if (frontier.has(l.source) && !near.has(l.target)) next.add(l.target);
    if (frontier.has(l.target) && !near.has(l.source)) next.add(l.source);
  }
  return next;
}

/** What limits the shown terms: the domain filter, dated terms only, a neighbourhood. */
export type TermFilter = {
  domains: ReadonlySet<string>;
  /** The time layout: only terms with an era. */
  datedOnly: boolean;
  /** Hops shown around the selected term; null = the whole map (SPEC §7: progressive). */
  hops: number | null;
  selected: string | null;
};

/** Terms shown: the domain filter (A86), the time layout's dated terms, a neighbourhood. */
export function visibleTermIds(graph: Graph, f: TermFilter): Set<string> {
  const base = graph.nodes.filter(
    (n) => termVisible(n, f.domains) && (!f.datedOnly || n.era !== undefined),
  );
  const ids = new Set(base.map((n) => n.id));
  if (f.hops === null || !f.selected || !ids.has(f.selected)) return ids;
  return neighbourhood(graph.links, ids, f.selected, f.hops);
}

/** The shown terms, and the links of the enabled families between them. */
export const visibleGraph = (
  graph: Graph,
  ids: ReadonlySet<string>,
  families: ReadonlySet<string>,
): Graph => ({
  nodes: graph.nodes.filter((n) => ids.has(n.id)),
  links: graph.links.filter(
    (l) => families.has(l.family) && ids.has(l.source) && ids.has(l.target),
  ),
});

/** Terms of the enabled domains the time layout leaves out (no era). */
export const undatedCount = (nodes: GraphNode[], domains: ReadonlySet<string>): number =>
  nodes.filter((n) => termVisible(n, domains) && n.era === undefined).length;

/** A term's colour by what the reader knows of it (SPEC §9). */
export function knowledgeColour(s: TermState | undefined, theme: MapTheme): string {
  const status = s?.status ?? ((s?.box ?? 0) >= 3 ? 'know' : s?.box ? 'learning' : undefined);
  return status ? KNOWLEDGE_COLOURS[theme][status] : MAP_INK[theme].unknown;
}

/** The time layout's note: what it shows, and how many undated terms it leaves out. */
function timeNote(ui: Record<string, string>, undated: number): string {
  const left =
    undated === 0
      ? ''
      : undated === 1
        ? ui.undatedNoteOne
        : ui.undatedNote.replace('{n}', String(undated));
  return `${ui.timeNote} ${left}`.trim();
}

/** The one-line note under the bar for the current view ('' for the force layout). */
export function layoutNote(
  ui: Record<string, string>,
  mode: Mode,
  layout: Layout,
  undated: number,
): string {
  if (mode === '3d') return ui.galaxyNote;
  if (layout === 'depth') return ui.depthNote;
  if (layout === 'time') return timeNote(ui, undated);
  return '';
}

/** A found route as "A → B → C", or the no-route message. */
export const routeLabel = (
  path: string[] | null,
  name: (id: string) => string,
  noRoute: string,
): string => (path ? path.map(name).join(' → ') : noRoute);

/** The hover card's width, in pixels (Tailwind w-64). */
export const HOVER_CARD_W = 256;

/** Where the hover card sits beside a point, kept inside a `w` × `h` map. */
export function hoverCardPlace(p: { x: number; y: number }, w: number, h: number) {
  const left = p.x + 18 + HOVER_CARD_W > w ? Math.max(8, p.x - 18 - HOVER_CARD_W) : p.x + 18;
  const top = Math.min(Math.max(8, p.y - 24), h - 160);
  return { left, top };
}

/** The legend lists only enabled domains; re-homed shared terms wear their domain colour. */
export const legendNodes = (nodes: GraphNode[], domains: ReadonlySet<string>) =>
  nodes
    .filter((n) => effectiveHome(n, domains) === homeDomain(n))
    .map((n) => ({ cluster: n.cluster, domain: n.domain.filter((d) => domains.has(d)) }));
