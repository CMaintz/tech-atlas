/**
 * The options of a generated multiple-choice question: the right answer plus three
 * plausible wrong ones. Draws from the context's random source.
 */
import type { GraphNode } from './graph-model';
import { edgesOf, relatives, type QuizGraph } from './quiz-graph';
import { shuffle } from './quiz-random';
import { SYMMETRIC } from './quiz-text';
import type { Dir, Lang, Question, QuestionKind, Rng } from './quiz-types';
import type { EdgeType } from '../schema';

/** What every generator needs: the indexed graph, the language and the random source. */
export type QuizContext = { g: QuizGraph; lang: Lang; rng: Rng };
/** The part a wrong answer should play: the far end of a `type` edge seen in `dir`. */
export type Role = { type: EdgeType; dir: Dir };

export const nameOf = (ctx: QuizContext, n: GraphNode) => n.term[ctx.lang];

export const isQuestion = (q: Question | null): q is Question => q !== null;

/** Whether `n` plays `role` elsewhere in the map (e.g. something else is protected against). */
const playsRole = (g: QuizGraph, n: GraphNode, role?: Role) =>
  role
    ? edgesOf(g, n.id).some(
        (e) => e.type === role.type && (SYMMETRIC.has(role.type) || e.dir !== role.dir),
      )
    : false;

/** How plausible `n` is as a wrong answer where `answer` is right; 0 is not at all. */
const plausibility = (g: QuizGraph, n: GraphNode, answer: GraphNode, role?: Role) =>
  (playsRole(g, n, role) ? 2 : 0) +
  (n.cluster === answer.cluster ? 2 : 0) +
  (n.domain.some((d) => answer.domain.includes(d)) ? 1 : 0);

/**
 * Three wrong answers, most plausible first: terms playing the same role elsewhere
 * in the map (e.g. other things something protects against), then the answer's
 * cluster, then its domain. Never anything in `exclude`, nor a structural relative
 * or alternative of the answer — each would make the question ambiguous.
 */
export function distractors(
  ctx: QuizContext,
  answer: GraphNode,
  exclude: Set<string>,
  role?: Role,
  filter: (n: GraphNode) => boolean = () => true,
): GraphNode[] {
  const blocked = new Set([answer.id, ...exclude, ...relatives(ctx.g, answer.id)]);
  const allowed = ctx.g.graph.nodes.filter((n) => !blocked.has(n.id) && filter(n));
  return shuffle(allowed, ctx.rng)
    .map((n) => ({ n, score: plausibility(ctx.g, n, answer, role) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.n);
}

/** A multiple-choice question in the making; options show names unless `label` says otherwise. */
export type Choice = {
  termId: string;
  kind: QuestionKind;
  prompt: string;
  answer: GraphNode;
  wrong: GraphNode[];
  label?: (n: GraphNode) => string;
};

/** The question with its options shuffled, or null without three wrong answers. */
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
