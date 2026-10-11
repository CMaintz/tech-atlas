import type { Graph, GraphNode } from './graph-model';
import { isDue, isWeak, type Learner } from './learner';
import type { Quizzer } from './quiz';
import type { Question, QuestionKind } from './quiz-types';

export type Scope = 'all' | 'weak' | `domain:${string}` | `cluster:${string}`;

type SessionPlan = { graph: Graph; learner: Learner; scope: Scope; quizzer: Quizzer };
type HandPicking = { quizzer: Quizzer; learner: Learner; asked: Set<string>; now: number };

export function inScope(n: GraphNode, scope: Scope, learner: Learner): boolean {
  if (scope === 'all') return true;
  if (scope === 'weak') return isWeak(learner.terms[n.id]);
  if (scope.startsWith('domain:')) return n.domain.includes(scope.slice(7));
  if (scope.startsWith('cluster:')) return n.cluster === scope.slice(8);
  return false;
}

function practiseOrder({ graph, learner, scope, quizzer }: SessionPlan, now: number) {
  const pool = graph.nodes.filter((n) => inScope(n, scope, learner));
  const due = pool.filter((n) => isDue(learner.terms[n.id], now));
  const fresh = pool.filter((n) => !learner.terms[n.id]?.box);
  const rest = pool.filter((n) => !due.includes(n) && !fresh.includes(n));
  return [...quizzer.shuffle(due), ...quizzer.shuffle(fresh), ...quizzer.shuffle(rest)];
}

function handQuestion({ quizzer, learner, asked, now }: HandPicking, id: string): Question | null {
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

function generatedQuestion(quizzer: Quizzer, id: string, used: Map<QuestionKind, number>) {
  const options = quizzer.questionsFor(id);
  if (!options.length) return null;
  const least = Math.min(...options.map((q) => used.get(q.kind) ?? 0));
  const q = quizzer.pick(options.filter((o) => (used.get(o.kind) ?? 0) === least));
  used.set(q.kind, (used.get(q.kind) ?? 0) + 1);
  return q;
}

function questionPicker(quizzer: Quizzer, learner: Learner, now: number) {
  const used = new Map<QuestionKind, number>();
  const picking: HandPicking = { quizzer, learner, asked: new Set<string>(), now };
  return (id: string) => handQuestion(picking, id) ?? generatedQuestion(quizzer, id, used);
}

export function buildSession(plan: SessionPlan, count = 10, now = Date.now()): Question[] {
  const questionOn = questionPicker(plan.quizzer, plan.learner, now);
  const qs: Question[] = [];
  for (const n of practiseOrder(plan, now)) {
    const q = questionOn(n.id);
    if (!q) continue;
    qs.push(q);
    if (qs.length >= count) break;
  }
  return qs;
}
