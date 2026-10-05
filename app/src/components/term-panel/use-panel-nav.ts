import type { RefObject } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import {
  arrivalAnnouncement,
  connectionCycle,
  focusesName,
  nextCycleState,
  positionText,
  relationGroups,
  startHistory,
  stepCycle,
  travel,
  visit,
  type Arrival,
  type CycleState,
  type PanelHistory,
  type PanelRelation,
} from '../../lib/term-panel';
import type { PanelProps } from './types';

/** What navigation reads from the panel. */
type NavSource = PanelProps & { nameOf: (id: string) => string };

/** Where Previous/Next stand: the anchor's connections and the position among them. */
export type CycleView = {
  cycle: PanelRelation[];
  /** On the anchor itself (or back on it): the count shows, not a position. */
  atAnchor: boolean;
  anchorName: string;
  /** `{i} of {n} · {type}` for position `i`; empty for none. */
  positionOf: (i: number | null) => string;
};

export type PanelNav = CycleView & {
  walk: CycleState;
  trail: PanelHistory;
  /** Live-region text for moves that keep focus on their button. */
  announce: string;
  /** Show `target` via a panel control: Explorer (or Timeline) selects it on the map. */
  go: (target: string, arrival: Arrival) => void;
  /** Previous (-1) / Next (1) through the anchor's connections. */
  step: (dir: 1 | -1) => void;
  /** Back (-1) / Forward (1) through the terms viewed in this panel. */
  move: (dir: 1 | -1) => void;
};

/** The internals the arrival effect updates. */
type NavState = {
  walk: CycleState;
  setWalk: (w: CycleState) => void;
  setTrail: (f: (h: PanelHistory) => PanelHistory) => void;
  setAnnounce: (s: string) => void;
  pending: RefObject<{ id: string; arrival: Arrival } | null>;
  focusName: RefObject<boolean>;
  view: CycleView;
};

function cycleView(o: NavSource, walk: CycleState): CycleView {
  const known = (x: string) => o.graph.nodes.some((n) => n.id === x);
  const groups = relationGroups(o.graph, walk.anchor, o.edgeInverse, o.relationOrder);
  const cycle = connectionCycle(groups, known);
  const positionOf = (i: number | null) =>
    i === null || !cycle[i]
      ? ''
      : positionText(
          o.text.cyclePosition,
          i,
          cycle.length,
          o.edgeLabels[cycle[i].type] ?? cycle[i].type,
        );
  return {
    cycle,
    atAnchor: walk.anchor === o.id || walk.index === null,
    anchorName: o.nameOf(walk.anchor),
    positionOf,
  };
}

/**
 * When `id` changes, work out how the panel got there: `pending` marks a move the panel
 * itself asked for, so a step or history move is told apart from a pick made anywhere
 * else (node, chip, search). Before paint, so the position never shows a stale walk.
 */
function useArrival(o: NavSource, s: NavState) {
  const shownId = useRef(o.id);
  useLayoutEffect(() => {
    if (shownId.current === o.id) return;
    shownId.current = o.id;
    const arrival: Arrival =
      s.pending.current?.id === o.id ? s.pending.current.arrival : { via: 'other' };
    s.pending.current = null;
    const next = nextCycleState(s.walk, o.id, arrival, s.view.cycle);
    s.setWalk(next);
    if (arrival.via !== 'history') s.setTrail((h) => visit(h, o.id));
    s.focusName.current = focusesName(arrival);
    const where = next.anchor === o.id ? '' : s.view.positionOf(next.index);
    s.setAnnounce(arrivalAnnouncement(o.nameOf(o.id), where, s.focusName.current));
  }, [o.id]);
}

/** A newly opened term is announced by moving focus to its name (see `focusesName`). */
function useFocusName(id: string, heading: RefObject<HTMLElement>, focusName: RefObject<boolean>) {
  useEffect(() => {
    if (focusName.current) heading.current?.focus({ preventScroll: true });
    focusName.current = true;
  }, [id]);
}

/**
 * The panel's navigation: Previous/Next walk the anchor term's connections;
 * Back/Forward walk the terms viewed in this panel.
 */
export function usePanelNav(o: NavSource, heading: RefObject<HTMLElement>): PanelNav {
  const [walk, setWalk] = useState<CycleState>(() => ({ anchor: o.id, index: null }));
  const [trail, setTrail] = useState<PanelHistory>(() => startHistory(o.id));
  const [announce, setAnnounce] = useState('');
  const pending = useRef<{ id: string; arrival: Arrival } | null>(null);
  const focusName = useRef(true);
  const view = cycleView(o, walk);
  useArrival(o, { walk, setWalk, setTrail, setAnnounce, pending, focusName, view });
  useFocusName(o.id, heading, focusName);
  const go = (target: string, arrival: Arrival) => {
    pending.current = { id: target, arrival };
    o.onSelect(target);
  };
  const step = (dir: 1 | -1) => {
    const i = stepCycle(view.cycle.length, view.atAnchor ? null : walk.index, dir);
    if (i === null) return;
    const target = view.cycle[i].id;
    if (target !== o.id) return go(target, { via: 'step', index: i });
    // The same term listed under another relationship: only the position moves.
    setWalk({ anchor: walk.anchor, index: i });
    setAnnounce(`${o.nameOf(o.id)} - ${view.positionOf(i)}`);
  };
  const move = (dir: 1 | -1) => {
    const r = travel(trail, dir);
    if (!r) return;
    setTrail(r.history);
    go(r.id, { via: 'history' });
  };
  return { ...view, walk, trail, announce, go, step, move };
}
