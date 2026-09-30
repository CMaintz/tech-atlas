/**
 * Quiz questions generated from the graph (SPEC §9: learning falls out of the
 * relationships). Pure — the caller supplies the random source.
 *
 * Two families of question:
 *  - **about** a term X — its relationships, where the answer is always ANOTHER term
 *    (or true/false): what X requires, what builds on X, what X is a kind of, what
 *    protects against X, which term is not connected to X, …
 *  - **answered by** X — "which term matches this definition?" and "what does X
 *    mean?". These give X away on X's own page, so a term page shows them only for
 *    X's neighbours; domain and overall sessions use both families.
 *
 * The generators live in quiz-generate.ts, hand-written questions in quiz-bank.ts and
 * study sessions in quiz-session.ts; this module ties them to one graph and bank.
 */
import type { Graph, GraphNode } from './graph-model';
import type { ClientQuestion } from './question-rules';
import { bankFor, fromBank, indexBank, type BankIndex } from './quiz-bank';
import { definitionOf, meaningOf, questionsAbout, questionsFor } from './quiz-generate';
import { indexGraph, neighbours } from './quiz-graph';
import { isQuestion, type QuizContext } from './quiz-options';
import { pick, shuffle, varied } from './quiz-random';
import type { Lang, Question, Rng } from './quiz-types';

export type { Lang, Question, QuestionKind } from './quiz-types';
export { buildSession, inScope, type Scope } from './quiz-session';

/** Whether `q` may be asked on the page of `t`: it neither names `t` nor shows its summary. */
const fitsPage = (q: Question, t: GraphNode, lang: Lang) =>
  q.answer !== t.id &&
  q.options.every((o) => o.id !== t.id && (!t.summary || o.label !== t.summary[lang])) &&
  (!t.summary || !q.prompt.includes(t.summary[lang]));

/** Generated questions for the page of `t`: about it, plus definitions of its neighbours. */
function generatedForPage(ctx: QuizContext, t: GraphNode): Question[] {
  const self = new Set([t.id]);
  const near = shuffle([...neighbours(ctx.g, t.id)], ctx.rng).slice(0, 6);
  const theirs = near.flatMap((n) => [definitionOf(ctx, n, self), meaningOf(ctx, n, self)]);
  return [...questionsAbout(ctx, t.id), ...theirs].filter(
    (q): q is Question => isQuestion(q) && fitsPage(q, t, ctx.lang),
  );
}

/**
 * "Check yourself" on the page of `id`: hand-written questions that test it first
 * (never one whose answer is `id` itself), then generated questions about it, plus definition
 * questions whose answers are its neighbours. Never one answered by `id` itself,
 * never `id` among the options, and never its own summary as a stem or option.
 */
function pageQuestions(ctx: QuizContext, bank: BankIndex, id: string, count: number): Question[] {
  const t = ctx.g.byId.get(id);
  if (!t) return [];
  const hand = shuffle(bankFor(bank, id, true), ctx.rng)
    .slice(0, count)
    .map((q) => fromBank(ctx.rng, q, id));
  if (hand.length >= count) return hand;
  return [...hand, ...varied(generatedForPage(ctx, t), count - hand.length, ctx.rng)];
}

/**
 * `bank` is the hand-written question bank for `lang` (`/questions-<lang>.json`);
 * without it every question is generated from the graph.
 */
export function makeQuizzer(
  graph: Graph,
  lang: Lang,
  rng: Rng = Math.random,
  bank: ClientQuestion[] = [],
) {
  const ctx: QuizContext = { g: indexGraph(graph), lang, rng };
  const hand = indexBank(bank);
  return {
    questionsAbout: (id: string) => questionsAbout(ctx, id),
    questionsFor: (id: string) => questionsFor(ctx, id),
    pageQuestions: (id: string, count = 3) => pageQuestions(ctx, hand, id, count),
    bankFor: (id: string, onPage = false) => bankFor(hand, id, onPage),
    fromBank: (q: ClientQuestion, practised = q.terms[0]) => fromBank(rng, q, practised),
    shuffle: <T>(xs: T[]) => shuffle(xs, rng),
    pick: <T>(xs: T[]) => pick(xs, rng),
  };
}

export type Quizzer = ReturnType<typeof makeQuizzer>;
