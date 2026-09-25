/**
 * Pure merge of two copies of the learner's state (this browser's and the synced
 * row, A45). It is commutative and idempotent, so it doesn't matter which device
 * syncs first or how often: every copy converges on the same result.
 */
import { STATUSES, type Learner, type Status, type TermState } from './learner';

const maxDefined = (a?: number, b?: number) =>
  a === undefined ? b : b === undefined ? a : Math.max(a, b);

/** Status tie-break when two changes carry the same timestamp: any status beats none. */
const rank = (s?: Status) => (s ? STATUSES.length - STATUSES.indexOf(s) : 0);

/**
 * One term: the schedule (box, due) comes from the most recent quiz answer — a
 * wrong answer on one device must be able to demote a term — with the higher box
 * winning a tie; the status from the most recent change, so clearing one sticks.
 * Right/wrong counts take the larger side: summing would double-count answers
 * both copies already share. A missing timestamp counts as oldest.
 */
export function mergeTerm(a: TermState, b: TermState): TermState {
  const ra = a.reviewed ?? 0;
  const rb = b.reviewed ?? 0;
  const sr =
    ra !== rb
      ? ra > rb
        ? a
        : b
      : a.box !== b.box
        ? a.box > b.box
          ? a
          : b
        : a.due >= b.due
          ? a
          : b;
  const sa = a.statusAt ?? 0;
  const sb = b.statusAt ?? 0;
  const st = sa !== sb ? (sa > sb ? a : b) : rank(a.status) >= rank(b.status) ? a : b;

  // A fresh object with a fixed field order, so equal states serialise identically.
  const out: TermState = {
    box: sr.box,
    due: sr.due,
    right: Math.max(a.right, b.right),
    wrong: Math.max(a.wrong, b.wrong),
  };
  if (st.status) out.status = st.status;
  const reviewed = maxDefined(a.reviewed, b.reviewed);
  if (reviewed !== undefined) out.reviewed = reviewed;
  const statusAt = maxDefined(a.statusAt, b.statusAt);
  if (statusAt !== undefined) out.statusAt = statusAt;
  return out;
}

/** Union of two keyed records, merged per key, keys sorted. */
function mergeStates(
  a: Record<string, TermState>,
  b: Record<string, TermState>,
): Record<string, TermState> {
  const ids = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  const out: Record<string, TermState> = {};
  for (const id of ids) out[id] = mergeTerm(a[id] ?? b[id], b[id] ?? a[id]);
  return out;
}

/** Union of both copies' terms (and hand-written questions, A90), merged per key. */
export function mergeLearner(a: Learner, b: Learner): Learner {
  const terms = mergeStates(a.terms, b.terms);
  if (!a.questions && !b.questions) return { terms };
  return { terms, questions: mergeStates(a.questions ?? {}, b.questions ?? {}) };
}

/** True when two states hold the same data, whatever their key order. */
export const sameLearner = (a: Learner, b: Learner) =>
  JSON.stringify(mergeLearner(a, a)) === JSON.stringify(mergeLearner(b, b));
