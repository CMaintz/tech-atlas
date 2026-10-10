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

const fitsPage = (q: Question, t: GraphNode, lang: Lang) =>
  q.answer !== t.id &&
  q.options.every((o) => o.id !== t.id && (!t.summary || o.label !== t.summary[lang])) &&
  (!t.summary || !q.prompt.includes(t.summary[lang]));

function generatedForPage(ctx: QuizContext, t: GraphNode): Question[] {
  const self = new Set([t.id]);
  const near = shuffle([...neighbours(ctx.g, t.id)], ctx.rng).slice(0, 6);
  const theirs = near.flatMap((n) => [definitionOf(ctx, n, self), meaningOf(ctx, n, self)]);
  return [...questionsAbout(ctx, t.id), ...theirs].filter(
    (q): q is Question => isQuestion(q) && fitsPage(q, t, ctx.lang),
  );
}

function pageQuestions(
  ctx: QuizContext,
  bank: BankIndex,
  { id, count }: { id: string; count: number },
): Question[] {
  const t = ctx.g.byId.get(id);
  if (!t) return [];
  const hand = shuffle(bankFor(bank, id, true), ctx.rng)
    .slice(0, count)
    .map((q) => fromBank(ctx.rng, q, id));
  if (hand.length >= count) return hand;
  return [...hand, ...varied(generatedForPage(ctx, t), count - hand.length, ctx.rng)];
}

type QuizzerSources = { rng?: Rng; bank?: ClientQuestion[] };

export function makeQuizzer(graph: Graph, lang: Lang, sources: QuizzerSources = {}) {
  const { rng = Math.random, bank = [] } = sources;
  const ctx: QuizContext = { g: indexGraph(graph), lang, rng };
  const hand = indexBank(bank);
  return {
    questionsAbout: (id: string) => questionsAbout(ctx, id),
    questionsFor: (id: string) => questionsFor(ctx, id),
    pageQuestions: (id: string, count = 3) => pageQuestions(ctx, hand, { id, count }),
    bankFor: (id: string, onPage = false) => bankFor(hand, id, onPage),
    fromBank: (q: ClientQuestion, practised = q.terms[0]) => fromBank(rng, q, practised),
    shuffle: <T>(xs: T[]) => shuffle(xs, rng),
    pick: <T>(xs: T[]) => pick(xs, rng),
  };
}

export type Quizzer = ReturnType<typeof makeQuizzer>;
