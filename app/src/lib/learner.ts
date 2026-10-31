import type { Graph, GraphNode } from './graph-model';

export type Status = 'know' | 'familiar' | 'learning' | 'unknown';
export type TermState = {
  box: number;
  due: number;
  right: number;
  wrong: number;
  status?: Status;
  reviewed?: number;
  statusAt?: number;
};
export type Learner = { terms: Record<string, TermState>; questions?: Record<string, TermState> };

export const STATUSES: readonly Status[] = ['know', 'familiar', 'learning', 'unknown'];

const LEARNER_KEY = 'atlas:learner:v2';
const KEY = LEARNER_KEY;
const DAY = 24 * 60 * 60 * 1000;
const REVIEW_DAYS_BY_BOX = [0, 1, 3, 7, 16, 35];
const blank = (): TermState => ({ box: 0, due: 0, right: 0, wrong: 0 });

const stamp = (prev: number | undefined, now: number) =>
  prev === undefined ? now : Math.max(now, prev + 1);

export function parseLearner(value: unknown, now = Date.now()): Learner {
  const raw = value as Learner | null;
  const terms = parseStates(raw?.terms, now);
  if (!raw?.questions || typeof raw.questions !== 'object') return { terms };
  return { terms, questions: parseStates(raw.questions, now) };
}

function parseStates(raw: unknown, now: number): Record<string, TermState> {
  const out: Record<string, TermState> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, t] of Object.entries(raw as Record<string, TermState>)) {
    if (t && typeof t === 'object') out[id] = parseState(t, now);
  }
  return out;
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function parseState(t: TermState, now: number): TermState {
  const num = (v: unknown) => (finite(v) ? v : 0);
  const s: TermState = {
    box: num(t.box),
    due: num(t.due),
    right: num(t.right),
    wrong: num(t.wrong),
  };
  if (STATUSES.includes(t.status as Status)) s.status = t.status;
  const at = (v: number) => (v > now + DAY ? now : v);
  if (finite(t.reviewed)) s.reviewed = at(t.reviewed);
  if (finite(t.statusAt)) s.statusAt = at(t.statusAt);
  return s;
}

export function loadLearner(): Learner {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseLearner(JSON.parse(raw)) : { terms: {} };
  } catch {
    return { terms: {} };
  }
}

export function saveLearner(l: Learner) {
  try {
    localStorage.setItem(KEY, JSON.stringify(l));
    window.dispatchEvent(new CustomEvent('atlas:learner'));
  } catch {
    return;
  }
}

type Answer = { id: string; correct: boolean };

export function recordAnswer(l: Learner, { id, correct }: Answer, now = Date.now()): Learner {
  return { ...l, terms: { ...l.terms, [id]: step(l.terms[id], correct, now) } };
}

export function recordQuestion(l: Learner, { id, correct }: Answer, now = Date.now()): Learner {
  const questions = l.questions ?? {};
  return { ...l, questions: { ...questions, [id]: step(questions[id], correct, now) } };
}

function step(prev: TermState | undefined, correct: boolean, now: number): TermState {
  const s = { ...blank(), ...prev, reviewed: stamp(prev?.reviewed, now) };
  if (!correct) {
    s.box = 1;
    s.due = now + REVIEW_DAYS_BY_BOX[1] * DAY;
    s.wrong++;
  } else {
    if (s.box === 0 || s.due <= now) {
      s.box = Math.min(s.box + 1, REVIEW_DAYS_BY_BOX.length - 1);
      s.due = now + REVIEW_DAYS_BY_BOX[s.box] * DAY;
    }
    s.right++;
  }
  return s;
}

type StatusChange = { id: string; status: Status | undefined };

export function setStatus(l: Learner, { id, status }: StatusChange, now = Date.now()): Learner {
  const prev = l.terms[id];
  const s: TermState = { ...blank(), ...prev, statusAt: stamp(prev?.statusAt, now) };
  if (status) s.status = status;
  else delete s.status;
  return { ...l, terms: { ...l.terms, [id]: s } };
}

export const isDue = (s: TermState | undefined, now = Date.now()) =>
  !!s && s.box > 0 && s.due <= now;

const isKnown = (s: TermState | undefined) => s?.status === 'know' || (s?.box ?? 0) >= 3;

export const isWeak = (s: TermState | undefined) =>
  !!s && (s.status === 'learning' || s.status === 'unknown' || (s.wrong > 0 && s.box <= 1));

export function progressOf(l: Learner, now = Date.now()) {
  const states = Object.values(l.terms);
  return {
    practised: states.filter((s) => s.right + s.wrong > 0).length,
    known: states.filter(isKnown).length,
    due: states.filter((s) => isDue(s, now)).length,
    weak: states.filter(isWeak).length,
  };
}

export function recommendNext(graph: Graph, l: Learner, limit = 8): GraphNode[] {
  const known = (id: string) => isKnown(l.terms[id]);
  const anyKnown = graph.nodes.some((n) => known(n.id));
  return graph.nodes
    .filter((n) => !known(n.id))
    .filter((n) => (anyKnown ? n.requires.every(known) : n.requires.length === 0))
    .sort((a, b) => b.degree - a.degree || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function learnerExport(l: Learner, now = Date.now()): string {
  return JSON.stringify(
    { format: LEARNER_KEY, exportedAt: new Date(now).toISOString(), ...l },
    null,
    2,
  );
}
