import type { PanelRelation, PanelRelationGroup } from './term-panel';

export const connectionCycle = (
  groups: PanelRelationGroup[],
  known: (id: string) => boolean = () => true,
): PanelRelation[] =>
  groups.flatMap((g) => g.ids.filter(known).map((id) => ({ type: g.type, id })));

export function stepCycle(length: number, index: number | null, dir: 1 | -1): number | null {
  if (length <= 0) return null;
  if (index === null) return dir === 1 ? 0 : length - 1;
  return (((index + dir) % length) + length) % length;
}

export type CycleState = { anchor: string; index: number | null };

export type Arrival = { via: 'step'; index: number | null } | { via: 'history' } | { via: 'other' };

export type ArrivalAt = { id: string; arrival: Arrival };

export function nextCycleState(
  state: CycleState | null,
  { id, arrival }: ArrivalAt,
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

export const focusesName = (arrival: Arrival): boolean =>
  arrival.via === 'other' || (arrival.via === 'step' && arrival.index === null);

export const arrivalAnnouncement = (name: string, where: string, focusName: boolean): string =>
  focusName ? '' : where ? `${name} - ${where}` : name;

export type PanelHistory = { entries: string[]; pos: number };

const HISTORY_LIMIT = 50;

export const startHistory = (id: string): PanelHistory => ({ entries: [id], pos: 0 });

export function visit(h: PanelHistory, id: string, limit = HISTORY_LIMIT): PanelHistory {
  if (h.entries[h.pos] === id) return h;
  const entries = [...h.entries.slice(0, h.pos + 1), id].slice(-limit);
  return { entries, pos: entries.length - 1 };
}

export function travel(h: PanelHistory, dir: 1 | -1): { history: PanelHistory; id: string } | null {
  const pos = h.pos + dir;
  if (pos < 0 || pos >= h.entries.length) return null;
  return { history: { entries: h.entries, pos }, id: h.entries[pos] };
}

type CyclePosition = { index: number; length: number; type: string };

export const positionText = (template: string, { index, length, type }: CyclePosition) =>
  template
    .replace('{i}', String(index + 1))
    .replace('{n}', String(length))
    .replace('{type}', type);
