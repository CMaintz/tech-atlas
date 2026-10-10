import type { GraphNode } from './graph-model';
import { edgesOf, relatives, type QuizGraph, type Relation } from './quiz-graph';
import { shuffle } from './quiz-random';
import { SYMMETRIC } from './quiz-text';
import type { Lang, Question, QuestionKind, Rng } from './quiz-types';

export type QuizContext = { g: QuizGraph; lang: Lang; rng: Rng };
type Role = Relation;

type Wanted = { answer: GraphNode; role?: Role };
type DistractorRules = { exclude: Set<string>; role?: Role; filter?: (n: GraphNode) => boolean };

export const nameOf = (ctx: QuizContext, n: GraphNode) => n.term[ctx.lang];

export const isQuestion = (q: Question | null): q is Question => q !== null;

const playsRole = (g: QuizGraph, n: GraphNode, role?: Role) =>
  role
    ? edgesOf(g, n.id).some(
        (e) => e.type === role.type && (SYMMETRIC.has(role.type) || e.dir !== role.dir),
      )
    : false;

const plausibility = (g: QuizGraph, n: GraphNode, { answer, role }: Wanted) =>
  (playsRole(g, n, role) ? 2 : 0) +
  (n.cluster === answer.cluster ? 2 : 0) +
  (n.domain.some((d) => answer.domain.includes(d)) ? 1 : 0);

export function distractors(
  ctx: QuizContext,
  answer: GraphNode,
  rules: DistractorRules,
): GraphNode[] {
  const { exclude, role, filter = () => true } = rules;
  const blocked = new Set([answer.id, ...exclude, ...relatives(ctx.g, answer.id)]);
  const allowed = ctx.g.graph.nodes.filter((n) => !blocked.has(n.id) && filter(n));
  return shuffle(allowed, ctx.rng)
    .map((n) => ({ n, score: plausibility(ctx.g, n, { answer, role }) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.n);
}

export type Choice = {
  termId: string;
  kind: QuestionKind;
  prompt: string;
  answer: GraphNode;
  wrong: GraphNode[];
  label?: (n: GraphNode) => string;
};

export function multiple(ctx: QuizContext, c: Choice): Question | null {
  if (c.wrong.length < 3) return null;
  const label = c.label ?? ((n: GraphNode) => nameOf(ctx, n));
  return {
    termId: c.termId,
    kind: c.kind,
    prompt: c.prompt,
    answer: c.answer.id,
    link: c.answer.id,
    options: shuffle([c.answer, ...c.wrong], ctx.rng).map((n) => ({ id: n.id, label: label(n) })),
  };
}
