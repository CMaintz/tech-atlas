/** A study session: which terms to practise, in what order, with which question each. */
import type { Graph, GraphNode } from './graph-model';
import { isDue, isWeak, type Learner } from './learner';
import type { Quizzer } from './quiz';
import type { Question, QuestionKind } from './quiz-types';

/** What a study session draws from: everything, one domain, one cluster, or weak terms. */
export type Scope = 'all' | 'weak' | `domain:${string}` | `cluster:${string}`;

export function inScope(n: GraphNode, scope: Scope, learner: Learner): boolean {
  if (scope === 'all') return true;
  if (scope === 'weak') return isWeak(learner.terms[n.id]);
  if (scope.startsWith('domain:')) return n.domain.includes(scope.slice(7));
  if (scope.startsWith('cluster:')) return n.cluster === scope.slice(8);
  return false;
}

/** The terms in scope: due reviews first, then terms never practised, then the rest — each group shuffled. */
function practiseOrder(
  graph: Graph,
  learner: Learner,
  scope: Scope,
  quizzer: Quizzer,
  now: number,
) {
  const pool = graph.nodes.filter((n) => inScope(n, scope, learner));
  const due = pool.filter((n) => isDue(learner.terms[n.id], now));
  const fresh = pool.filter((n) => !learner.terms[n.id]?.box);
  const rest = pool.filter((n) => !due.includes(n) && !fresh.includes(n));
  return [...quizzer.shuffle(due), ...quizzer.shuffle(fresh), ...quizzer.shuffle(rest)];
}

/** A hand-written question on `id` that is new or due by its own record and not yet `asked`. */
function handQuestion(
  quizzer: Quizzer,
  learner: Learner,
  id: string,
  asked: Set<string>,
  now: number,
): Question | null {
  const hand = quizzer
    .bankFor(id)
    .filter((q) => !asked.has(q.id))
    .filter((q) => {
      const s = learner.questions?.[q.id];
      return !s?.box || isDue(s, now);
    });
  if (!hand.length) return null;
  const q = quizzer.pick(hand);
  asked.add(q.id);
  return quizzer.fromBank(q, id);
}

/** A generated question on `id` of a kind `used` least so far in the session. */
function generatedQuestion(quizzer: Quizzer, id: string, used: Map<QuestionKind, number>) {
  const options = quizzer.questionsFor(id);
  if (!options.length) return null;
  const least = Math.min(...options.map((q) => used.get(q.kind) ?? 0));
  const q = quizzer.pick(options.filter((o) => (used.get(o.kind) ?? 0) === least));
  used.set(q.kind, (used.get(q.kind) ?? 0) + 1);
  return q;
}

/** One question per term for a session: hand-written ones never twice, generated kinds rotated. */
function questionPicker(quizzer: Quizzer, learner: Learner, now: number) {
  const used = new Map<QuestionKind, number>();
  const asked = new Set<string>();
  return (id: string) =>
    handQuestion(quizzer, learner, id, asked, now) ?? generatedQuestion(quizzer, id, used);
}

/**
 * A study session: due reviews first, then terms never practised, then the rest;
 * one question per term. A term with a hand-written question that is new or due
 * (by the question's own record) gets that — never the same one twice in a
 * session; otherwise a generated one, rotating question kinds so the session mixes
 * definition → term, term → definition, relationships, odd-one-out and true/false.
 */
export function buildSession(
  graph: Graph,
  learner: Learner,
  scope: Scope,
  quizzer: Quizzer,
  count = 10,
  now = Date.now(),
): Question[] {
  const questionOn = questionPicker(quizzer, learner, now);
  const qs: Question[] = [];
  for (const n of practiseOrder(graph, learner, scope, quizzer, now)) {
    const q = questionOn(n.id);
    if (!q) continue;
    qs.push(q);
    if (qs.length >= count) break;
  }
  return qs;
}
