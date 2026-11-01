import type { RefObject } from 'preact';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type StateUpdater,
} from 'preact/hooks';
import {
  arrivalAnnouncement,
  connectionCycle,
  focusesName,
  nextCycleState,
  positionText,
  startHistory,
  stepCycle,
  travel,
  visit,
  type Arrival,
  type ArrivalAt,
  type CycleState,
  type PanelHistory,
} from '../../lib/panel-nav';
import { relationGroups, type PanelRelation } from '../../lib/term-panel';
import type { PanelProps } from './types';

type NavSource = PanelProps & { nameOf: (id: string) => string };

type CycleView = {
  cycle: PanelRelation[];
  atAnchor: boolean;
  anchorName: string;
  positionOf: (i: number | null) => string;
};

export type PanelNav = CycleView & {
  walk: CycleState;
  trail: PanelHistory;
  announce: string;
  go: (target: string, arrival: Arrival) => void;
  step: (dir: 1 | -1) => void;
  move: (dir: 1 | -1) => void;
};

type NavState = {
  walk: CycleState;
  trail: PanelHistory;
  setWalk: (w: CycleState) => void;
  setTrail: Dispatch<StateUpdater<PanelHistory>>;
  setAnnounce: (s: string) => void;
  pending: RefObject<ArrivalAt | null>;
  focusName: RefObject<boolean>;
  view: CycleView;
};

function cycleView(o: NavSource, walk: CycleState): CycleView {
  const known = (x: string) => o.graph.nodes.some((n) => n.id === x);
  const groups = relationGroups(o.graph, walk.anchor, {
    inverse: o.edgeInverse,
    order: o.relationOrder,
  });
  const cycle = connectionCycle(groups, known);
  return {
    cycle,
    atAnchor: walk.anchor === o.id || walk.index === null,
    anchorName: o.nameOf(walk.anchor),
    positionOf: positionLabeller(o, cycle),
  };
}

const positionLabeller =
  (o: NavSource, cycle: PanelRelation[]) =>
  (i: number | null): string => {
    if (i === null || !cycle[i]) return '';
    const type = o.edgeLabels[cycle[i].type] ?? cycle[i].type;
    return positionText(o.text.cyclePosition, { index: i, length: cycle.length, type });
  };

function useArrival(o: NavSource, s: NavState) {
  const shownId = useRef(o.id);
  useLayoutEffect(() => {
    if (shownId.current === o.id) return;
    shownId.current = o.id;
    const arrival: Arrival =
      s.pending.current?.id === o.id ? s.pending.current.arrival : { via: 'other' };
    s.pending.current = null;
    const next = nextCycleState(s.walk, { id: o.id, arrival }, s.view.cycle);
    s.setWalk(next);
    if (arrival.via !== 'history') s.setTrail((h) => visit(h, o.id));
    s.focusName.current = focusesName(arrival);
    const where = next.anchor === o.id ? '' : s.view.positionOf(next.index);
    s.setAnnounce(arrivalAnnouncement(o.nameOf(o.id), where, s.focusName.current));
  }, [o.id]);
}

function useFocusName(
  id: string,
  heading: RefObject<HTMLElement | null>,
  focusName: RefObject<boolean>,
) {
  useEffect(() => {
    if (focusName.current) heading.current?.focus({ preventScroll: true });
    focusName.current = true;
  }, [id]);
}

export function usePanelNav(o: NavSource, heading: RefObject<HTMLElement | null>): PanelNav {
  const [walk, setWalk] = useState<CycleState>(() => ({ anchor: o.id, index: null }));
  const [trail, setTrail] = useState<PanelHistory>(() => startHistory(o.id));
  const [announce, setAnnounce] = useState('');
  const pending = useRef<ArrivalAt | null>(null);
  const focusName = useRef(true);
  const view = cycleView(o, walk);
  const state = { walk, trail, setWalk, setTrail, setAnnounce, pending, focusName, view };
  useArrival(o, state);
  useFocusName(o.id, heading, focusName);
  const go = goVia(o, pending);
  const actions = { go, step: stepper(o, state, go), move: mover(state, go) };
  return { ...view, walk, trail, announce, ...actions };
}

type Go = PanelNav['go'];

const goVia =
  (o: NavSource, pending: NavState['pending']): Go =>
  (target, arrival) => {
    pending.current = { id: target, arrival };
    o.onSelect(target);
  };

const stepper =
  (o: NavSource, s: NavState, go: Go) =>
  (dir: 1 | -1): void => {
    const i = stepCycle(s.view.cycle.length, s.view.atAnchor ? null : s.walk.index, dir);
    if (i === null) return;
    const target = s.view.cycle[i].id;
    if (target !== o.id) return go(target, { via: 'step', index: i });
    s.setWalk({ anchor: s.walk.anchor, index: i });
    s.setAnnounce(`${o.nameOf(o.id)} - ${s.view.positionOf(i)}`);
  };

const mover =
  (s: NavState, go: Go) =>
  (dir: 1 | -1): void => {
    const r = travel(s.trail, dir);
    if (!r) return;
    s.setTrail(r.history);
    go(r.id, { via: 'history' });
  };
