/**
 * The learner's own state — quiz history, spaced-repetition schedule and
 * self-assessed knowledge — kept only in this browser (A24: local-first; a
 * database arrives with accounts/sync, ADR-0008).
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
};
export type Learner = { terms: Record<string, TermState> };

const KEY = 'atlas:learner:v1';
const DAY = 24 * 60 * 60 * 1000;
/** Days until the next review, per Leitner box. */
const INTERVALS = [0, 1, 3, 7, 16, 35];
const blank = (): TermState => ({ box: 0, due: 0, right: 0, wrong: 0 });

export function loadLearner(): Learner {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Learner) : null;
    return parsed?.terms ? parsed : { terms: {} };
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
  const s = { ...blank(), ...l.terms[id] };
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

export function setStatus(l: Learner, id: string, status: Status | undefined): Learner {
  return { terms: { ...l.terms, [id]: { ...blank(), ...l.terms[id], status } } };
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
