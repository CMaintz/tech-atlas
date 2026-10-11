import { STATUSES, type Learner, type Status, type TermState } from './learner';

const maxDefined = (a?: number, b?: number) =>
  a === undefined ? b : b === undefined ? a : Math.max(a, b);

const rank = (s?: Status) => (s ? STATUSES.length - STATUSES.indexOf(s) : 0);

export function scheduleSource(a: TermState, b: TermState): TermState {
  const ra = a.reviewed ?? 0;
  const rb = b.reviewed ?? 0;
  if (ra !== rb) return ra > rb ? a : b;
  if (a.box !== b.box) return a.box > b.box ? a : b;
  return a.due >= b.due ? a : b;
}

export function statusSource(a: TermState, b: TermState): TermState {
  const sa = a.statusAt ?? 0;
  const sb = b.statusAt ?? 0;
  if (sa !== sb) return sa > sb ? a : b;
  return rank(a.status) >= rank(b.status) ? a : b;
}

export function mergeTerm(a: TermState, b: TermState): TermState {
  const sr = scheduleSource(a, b);
  const st = statusSource(a, b);
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

function mergeStates(
  a: Record<string, TermState>,
  b: Record<string, TermState>,
): Record<string, TermState> {
  const ids = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  const out: Record<string, TermState> = {};
  for (const id of ids) out[id] = mergeTerm(a[id] ?? b[id], b[id] ?? a[id]);
  return out;
}

export function mergeLearner(a: Learner, b: Learner): Learner {
  const terms = mergeStates(a.terms, b.terms);
  if (!a.questions && !b.questions) return { terms };
  return { terms, questions: mergeStates(a.questions ?? {}, b.questions ?? {}) };
}

export const sameLearner = (a: Learner, b: Learner) =>
  JSON.stringify(mergeLearner(a, a)) === JSON.stringify(mergeLearner(b, b));
