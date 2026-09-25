/**
 * The learner's own state — quiz history, spaced-repetition schedule and
 * self-assessed knowledge. Local-first (A24): localStorage is what the UI reads;
 * when accounts are configured, `account.ts` syncs it to the learner's own row
 * (A44), merging per term with `mergeLearner` (sync.ts).
 */
import type { Graph, GraphNode } from './graph-model';

export type Status = 'know' | 'familiar' | 'learning' | 'unknown';
export type TermState = {
  /** Leitner box: 0 = new, higher = remembered for longer. */
  box: number;
  /** Epoch ms when the term is next due for review. */
  due: number;
  right: number;
  wrong: number;
  status?: Status;
  /** Epoch ms of the last quiz answer (drives the merge of box/due). Absent until answered. */
  reviewed?: number;
  /** Epoch ms the status was last set or cleared (drives the status merge). Absent until set. */
  statusAt?: number;
};
/**
 * `terms` is keyed by term id. `questions`, keyed by hand-written question id (A90),
 * schedules each bank question on its own, so a question answered right recently
 * is not asked again before it is due; absent until one is answered.
 */
export type Learner = { terms: Record<string, TermState>; questions?: Record<string, TermState> };

export const STATUSES: readonly Status[] = ['know', 'familiar', 'learning', 'unknown'];

/** One key, one format; no migration from the pre-sync shape (A50: no users yet). */
export const LEARNER_KEY = 'atlas:learner:v2';
const KEY = LEARNER_KEY;
const DAY = 24 * 60 * 60 * 1000;
/** Days until the next review, per Leitner box. */
const INTERVALS = [0, 1, 3, 7, 16, 35];
const blank = (): TermState => ({ box: 0, due: 0, right: 0, wrong: 0 });

/**
 * A change's timestamp: now, but always after the term's previous change, so a
 * local edit made after merging a copy from a device whose clock runs ahead still
 * counts as newer (A48).
 */
const stamp = (prev: number | undefined, now: number) =>
  prev === undefined ? now : Math.max(now, prev + 1);

/**
 * Normalise stored or synced data into the current shape. Missing timestamps stay
 * absent (the merge treats them as 0, i.e. older than any timestamped change).
 * Anything malformed is dropped rather than trusted, and change timestamps more
 * than a day ahead of this clock are pulled back to now (A48), so one device with
 * a wrong clock can't make its changes unbeatable.
 */
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
    if (!t || typeof t !== 'object') continue;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    const s: TermState = {
      box: num(t.box),
      due: num(t.due),
      right: num(t.right),
      wrong: num(t.wrong),
    };
    if (STATUSES.includes(t.status as Status)) s.status = t.status;
    const at = (v: number) => (v > now + DAY ? now : v);
    if (typeof t.reviewed === 'number' && Number.isFinite(t.reviewed)) s.reviewed = at(t.reviewed);
    if (typeof t.statusAt === 'number' && Number.isFinite(t.statusAt)) s.statusAt = at(t.statusAt);
    out[id] = s;
  }
  return out;
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
    // Storage blocked (private mode, quota): progress simply isn't kept.
  }
}

/**
 * A right answer moves a term up a box — but only when it is new or due, so that
 * promotion reflects remembering over time, not answering three questions in a
 * row (the spacing is the point). A wrong answer always sends it back to box 1.
 */
export function recordAnswer(l: Learner, id: string, correct: boolean, now = Date.now()): Learner {
  return { ...l, terms: { ...l.terms, [id]: step(l.terms[id], correct, now) } };
}

/** The same schedule for one hand-written question, keyed by its id (A90). */
export function recordQuestion(
  l: Learner,
  id: string,
  correct: boolean,
  now = Date.now(),
): Learner {
  const questions = l.questions ?? {};
  return { ...l, questions: { ...questions, [id]: step(questions[id], correct, now) } };
}

function step(prev: TermState | undefined, correct: boolean, now: number): TermState {
  const s = { ...blank(), ...prev, reviewed: stamp(prev?.reviewed, now) };
  if (!correct) {
    s.box = 1;
    s.due = now + INTERVALS[1] * DAY;
    s.wrong++;
  } else {
    if (s.box === 0 || s.due <= now) {
      s.box = Math.min(s.box + 1, INTERVALS.length - 1);
      s.due = now + INTERVALS[s.box] * DAY;
    }
    s.right++;
  }
  return s;
}

/** Clearing a status (undefined) is recorded too, so the clear wins a later merge. */
export function setStatus(
  l: Learner,
  id: string,
  status: Status | undefined,
  now = Date.now(),
): Learner {
  const prev = l.terms[id];
  const s: TermState = { ...blank(), ...prev, statusAt: stamp(prev?.statusAt, now) };
  if (status) s.status = status;
  else delete s.status;
  return { ...l, terms: { ...l.terms, [id]: s } };
}

export const isDue = (s: TermState | undefined, now = Date.now()) =>
  !!s && s.box > 0 && s.due <= now;

/** A term counts as known if the learner says so, or has reached box 3 (three spaced right answers). */
export const isKnown = (s: TermState | undefined) => s?.status === 'know' || (s?.box ?? 0) >= 3;

/**
 * A weak term: the learner says they are still learning it or don't understand it,
 * or they have got it wrong and it is still in box 1: a wrong answer resets it to box 1, and
 * it only leaves the weak list once a right answer at its next due review promotes it.
 */
export const isWeak = (s: TermState | undefined) =>
  !!s && (s.status === 'learning' || s.status === 'unknown' || (s.wrong > 0 && s.box <= 1));

/**
 * What to learn next: terms not yet known whose direct prerequisites are all
 * known (so they are within reach), best-connected first.
 */
export function recommendNext(graph: Graph, l: Learner, limit = 8): GraphNode[] {
  const known = (id: string) => isKnown(l.terms[id]);
  const anyKnown = graph.nodes.some((n) => known(n.id));
  return graph.nodes
    .filter((n) => !known(n.id))
    .filter((n) => (anyKnown ? n.requires.every(known) : n.requires.length === 0))
    .sort((a, b) => b.degree - a.degree || a.id.localeCompare(b.id))
    .slice(0, limit);
}

/**
 * The learner's progress as a downloadable JSON document (data portability, A88):
 * exactly what this browser stores and, when signed in, what is synced.
 */
export function learnerExport(l: Learner, now = Date.now()): string {
  return JSON.stringify(
    { format: LEARNER_KEY, exportedAt: new Date(now).toISOString(), ...l },
    null,
    2,
  );
}
