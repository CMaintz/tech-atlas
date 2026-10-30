import type { Graph, GraphLink, GraphNode } from './graph-model';
import { MAP_INK, homeDomain, type MapTheme } from './graph-style';
import { effectiveHome, termVisible } from './graph-layout';
import type { TermState } from './learner';
import type { Layout } from './explorer-2d';

export type Mode = '2d' | '3d';

export const KNOWLEDGE_COLOURS: Record<MapTheme, Record<string, string>> = {
  dark: {
    know: '#22c55e',
    familiar: '#84cc16',
    learning: '#f59e0b',
    unknown: '#ef4444',
  },
  light: { know: '#15803d', familiar: '#4d7c0f', learning: '#b45309', unknown: '#b91c1c' },
};

export function toggled(set: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

type LinkedTerms = { links: GraphLink[]; ids: ReadonlySet<string> };

export function neighbourhood(within: LinkedTerms, start: string, hops: number): Set<string> {
  const near = new Set([start]);
  let frontier = new Set([start]);
  for (let h = 0; h < hops; h++) {
    frontier = nextRing(within, frontier, near);
    for (const id of frontier) near.add(id);
  }
  return near;
}

function nextRing(
  { links, ids }: LinkedTerms,
  frontier: ReadonlySet<string>,
  near: ReadonlySet<string>,
): Set<string> {
  const next = new Set<string>();
  for (const l of links) {
    if (!ids.has(l.source) || !ids.has(l.target)) continue;
    if (frontier.has(l.source) && !near.has(l.target)) next.add(l.target);
    if (frontier.has(l.target) && !near.has(l.source)) next.add(l.source);
  }
  return next;
}

export type TermFilter = {
  domains: ReadonlySet<string>;
  datedOnly: boolean;
  hops: number | null;
  selected: string | null;
};

export function visibleTermIds(graph: Graph, f: TermFilter): Set<string> {
  const base = graph.nodes.filter(
    (n) => termVisible(n, f.domains) && (!f.datedOnly || n.era !== undefined),
  );
  const ids = new Set(base.map((n) => n.id));
  if (f.hops === null || !f.selected || !ids.has(f.selected)) return ids;
  return neighbourhood({ links: graph.links, ids }, f.selected, f.hops);
}

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

export const undatedCount = (nodes: GraphNode[], domains: ReadonlySet<string>): number =>
  nodes.filter((n) => termVisible(n, domains) && n.era === undefined).length;

export function knowledgeColour(s: TermState | undefined, theme: MapTheme): string {
  const status = s?.status ?? ((s?.box ?? 0) >= 3 ? 'know' : s?.box ? 'learning' : undefined);
  return status ? KNOWLEDGE_COLOURS[theme][status] : MAP_INK[theme].unknown;
}

function timeNote(ui: Record<string, string>, undated: number): string {
  const left =
    undated === 0
      ? ''
      : undated === 1
        ? ui.undatedNoteOne
        : ui.undatedNote.replace('{n}', String(undated));
  return `${ui.timeNote} ${left}`.trim();
}

type MapView = { mode: Mode; layout: Layout };

export function layoutNote(ui: Record<string, string>, view: MapView, undated: number): string {
  if (view.mode === '3d') return ui.galaxyNote;
  if (view.layout === 'depth') return ui.depthNote;
  if (view.layout === 'time') return timeNote(ui, undated);
  return '';
}

export const routeLabel = (
  path: string[] | null,
  name: (id: string) => string,
  noRoute: string,
): string => (path ? path.map(name).join(' → ') : noRoute);

const HOVER_CARD_W = 256;

export function hoverCardPlace(p: { x: number; y: number }, w: number, h: number) {
  const left = p.x + 18 + HOVER_CARD_W > w ? Math.max(8, p.x - 18 - HOVER_CARD_W) : p.x + 18;
  const top = Math.min(Math.max(8, p.y - 24), h - 160);
  return { left, top };
}

export const legendNodes = (nodes: GraphNode[], domains: ReadonlySet<string>) =>
  nodes
    .filter((n) => effectiveHome(n, domains) === homeDomain(n))
    .map((n) => ({ cluster: n.cluster, domain: n.domain.filter((d) => domains.has(d)) }));
