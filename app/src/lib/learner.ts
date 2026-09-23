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
  /** Epoch ms of the last quiz answer (drives the merge of box/due). Absent in v1 data. */
  reviewed?: number;
  /** Epoch ms the status was last set or cleared (drives the status merge). Absent in v1 data. */
  statusAt?: number;
};
export type Learner = { terms: Record<string, TermState> };

export const STATUSES: readonly Status[] = ['know', 'familiar', 'learning', 'unknown'];

const KEY = 'atlas:learner:v2';
const KEY_V1 = 'atlas:learner:v1';
const DAY = 24 * 60 * 60 * 1000;
/** Days until the next review, per Leitner box. */
const INTERVALS = [0, 1, 3, 7, 16, 35];
const blank = (): TermState => ({ box: 0, due: 0, right: 0, wrong: 0 });

/**
 * Normalise stored data into the current shape. v1 had no timestamps; they stay
 * absent (the merge treats them as 0, i.e. older than any timestamped change).
 * Anything malformed is dropped rather than trusted.
 */
export function parseLearner(value: unknown): Learner {
  const terms: Record<string, TermState> = {};
  const raw = (value as Learner | null)?.terms;
  if (!raw || typeof raw !== 'object') return { terms };
  for (const [id, t] of Object.entries(raw)) {
    if (!t || typeof t !== 'object') continue;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    const s: TermState = {
      box: num(t.box),
      due: num(t.due),
      right: num(t.right),
      wrong: num(t.wrong),
    };
    if (STATUSES.includes(t.status as Status)) s.status = t.status;
    if (typeof t.reviewed === 'number') s.reviewed = t.reviewed;
    if (typeof t.statusAt === 'number') s.statusAt = t.statusAt;
    terms[id] = s;
  }
  return { terms };
}

export function loadLearner(): Learner {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return parseLearner(JSON.parse(raw));
    // One-time migration from v1 (no timestamps): copy forward, keep v1 untouched.
    const v1 = localStorage.getItem(KEY_V1);
    if (!v1) return { terms: {} };
    const migrated = parseLearner(JSON.parse(v1));
    localStorage.setItem(KEY, JSON.stringify(migrated));
    return migrated;
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
  const s = { ...blank(), ...l.terms[id], reviewed: now };
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
  return { terms: { ...l.terms, [id]: s } };
}

/** Clearing a status (undefined) is recorded too, so the clear wins a later merge. */
export function setStatus(
  l: Learner,
  id: string,
  status: Status | undefined,
  now = Date.now(),
): Learner {
  const s: TermState = { ...blank(), ...l.terms[id], statusAt: now };
  if (status) s.status = status;
  else delete s.status;
  return { terms: { ...l.terms, [id]: s } };
}

export const isDue = (s: TermState | undefined, now = Date.now()) =>
  !!s && s.box > 0 && s.due <= now;

/** A term counts as known if the learner says so, or has reached box 3 (three spaced right answers). */
export const isKnown = (s: TermState | undefined) => s?.status === 'know' || (s?.box ?? 0) >= 3;

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
