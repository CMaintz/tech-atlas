/**
 * Questions generated from the graph (SPEC §9), in the two families of A79:
 *  - **answered by** a term: definition → term and term → definition;
 *  - **about** a term, where the answer is always another term (or true/false):
 *    its relationships, the odd one out among its neighbours, and true/false
 *    statements about its edges.
 */
import { prerequisitesOf, type GraphNode } from './graph-model';
import {
  closure,
  edgesOf,
  ends,
  kin,
  mentioned,
  neighbours,
  type Edge,
  type QuizGraph,
} from './quiz-graph';
import { distractors, isQuestion, multiple, nameOf, type QuizContext } from './quiz-options';
import { pick, shuffle } from './quiz-random';
import { ASK, STATE, SYMMETRIC, T, TRANSITIVE } from './quiz-text';
import type { Dir, Question } from './quiz-types';
import type { EdgeType } from '../schema';

// ---- Questions answered BY a term (they name it) --------------------------------

/** Definition → term: the stem is `id`'s summary, the answer is `id`. */
export function definitionOf(ctx: QuizContext, id: string, avoid = new Set<string>()) {
  const t = ctx.g.byId.get(id);
  if (!t?.summary) return null;
  const wrong = distractors(ctx, t, avoid);
  const prompt = T.definition[ctx.lang](t.summary[ctx.lang]);
  return multiple(ctx, { termId: id, kind: 'definition', prompt, answer: t, wrong });
}

/** Term → definition: the stem names `id`, the options are summaries. */
export function meaningOf(ctx: QuizContext, id: string, avoid = new Set<string>()) {
  const t = ctx.g.byId.get(id);
  if (!t?.summary) return null;
  const wrong = distractors(ctx, t, avoid, undefined, (n) => !!n.summary);
  const prompt = T.meaning[ctx.lang](nameOf(ctx, t));
  const label = (n: GraphNode) => n.summary![ctx.lang];
  return multiple(ctx, { termId: id, kind: 'meaning', prompt, answer: t, wrong, label });
}

// ---- Questions ABOUT a term (never answered by it) ------------------------------

/**
 * Terms that must not be offered as a wrong answer to a `type`/`dir` question about
 * `id`: every right answer (`valid`), anything transitively also right, and everything
 * `around` the term.
 */
function alsoRight(
  g: QuizGraph,
  id: string,
  edge: { type: EdgeType; dir: Dir },
  valid: string[],
  around: string[],
) {
  const exclude = new Set([id, ...around, ...valid]);
  if (TRANSITIVE.has(edge.type))
    for (const c of closure(g, id, edge.type, edge.dir)) exclude.add(c);
  if (edge.type === 'requires') {
    for (const p of prerequisitesOf(g.graph, id)) exclude.add(p.id);
    for (const d of closure(g, id, 'requires', 'in')) exclude.add(d);
  }
  return exclude;
}

/** The question for one (edge type, direction) of `id`; the answer is one of its ends. */
function relationQuestion(
  ctx: QuizContext,
  id: string,
  type: EdgeType,
  dir: Dir,
  around: string[],
) {
  const { g, lang } = ctx;
  const valid = ends(g, id, type, dir);
  const answer = g.byId.get(pick(valid, ctx.rng))!;
  const exclude = alsoRight(g, id, { type, dir }, valid, around);
  const wrong = distractors(ctx, answer, exclude, { type, dir });
  const prompt = ASK[type]![dir]![lang](nameOf(ctx, g.byId.get(id)!));
  return multiple(ctx, { termId: id, kind: 'relation', prompt, answer, wrong });
}

/** One question per (edge type, direction) the term has; the answer is the other end. */
export function relationsOf(ctx: QuizContext, id: string): Question[] {
  const { g } = ctx;
  // Every neighbour, its close kin (a kind of a right answer is half right) and
  // every prose mention is off the table as a wrong answer.
  const near = [...neighbours(g, id)];
  const around = [...near, ...near.flatMap((n) => kin(g, n)), ...mentioned(g, id)];
  const seen = new Set<string>();
  const qs: (Question | null)[] = [];
  for (const e of shuffle(edgesOf(g, id), ctx.rng)) {
    const dir: Dir = SYMMETRIC.has(e.type) ? 'out' : e.dir;
    const key = `${e.type}:${dir}`;
    if (!ASK[e.type]?.[dir] || seen.has(key)) continue;
    seen.add(key);
    qs.push(relationQuestion(ctx, id, e.type, dir, around));
  }
  return qs.filter(isQuestion);
}

/** A term from the same area as `id` with no connection to it or to its neighbours `near`. */
function unrelatedTo(ctx: QuizContext, id: string, near: string[]) {
  const { g } = ctx;
  // Two steps away still reads as "related"; so does a term named in the other's prose.
  const twoSteps = near.flatMap((n) => [...neighbours(g, n)]);
  const exclude = new Set([id, ...near, ...twoSteps, ...mentioned(g, id)]);
  const [odd] = distractors(ctx, g.byId.get(id)!, exclude).filter(
    (n) => !mentioned(g, n.id).includes(id),
  );
  return odd;
}

/** Three neighbours and one term from the same area with no connection to `id`. */
export function oddOneOut(ctx: QuizContext, id: string): Question | null {
  const { g, lang } = ctx;
  const near = [...neighbours(g, id)];
  if (near.length < 3) return null;
  const shown = shuffle(near, ctx.rng).slice(0, 3);
  const odd = unrelatedTo(ctx, id, near);
  if (!odd) return null;
  const label = (x: string) => nameOf(ctx, g.byId.get(x)!);
  return {
    termId: id,
    kind: 'odd-one-out',
    prompt: T.odd[lang](nameOf(ctx, g.byId.get(id)!)),
    answer: odd.id,
    link: odd.id,
    options: shuffle([odd.id, ...shown], ctx.rng).map((x) => ({ id: x, label: label(x) })),
  };
}

/**
 * Edges of `id` a true/false statement can use: never a pair joined both ways by the
 * same type, whose reverse would not be false.
 */
const statable = (g: QuizGraph, id: string) =>
  edgesOf(g, id).filter(
    (e) =>
      STATE[e.type] &&
      !edgesOf(g, id).some((f) => f.type === e.type && f.other === e.other && f.dir !== e.dir),
  );

/** The statement of edge `e` of `id`: as authored when `truth`, else reversed. */
function statement(ctx: QuizContext, id: string, e: Edge, truth: boolean) {
  const [from, to] = e.dir === 'out' ? [id, e.other] : [e.other, id];
  const [a, b] = truth ? [from, to] : [to, from];
  const named = (x: string) => nameOf(ctx, ctx.g.byId.get(x)!);
  return STATE[e.type]![ctx.lang](named(a), named(b));
}

/** A relationship statement, true as authored or false by reversing its direction. */
export function trueFalse(ctx: QuizContext, id: string): Question | null {
  const usable = statable(ctx.g, id);
  if (!usable.length) return null;
  const e = pick(usable, ctx.rng);
  const truth = ctx.rng() < 0.5;
  return {
    termId: id,
    kind: 'true-false',
    prompt: T.trueFalse[ctx.lang](statement(ctx, id, e, truth)),
    answer: truth ? 'true' : 'false',
    // The learner is already on (or quizzing) `id`: explain via the other term.
    link: e.other,
    options: [
      { id: 'true', label: T.true[ctx.lang] },
      { id: 'false', label: T.false[ctx.lang] },
    ],
  };
}

/** Every question about `id` whose answer is some other term (or true/false). */
export function questionsAbout(ctx: QuizContext, id: string): Question[] {
  if (!ctx.g.byId.has(id)) return [];
  return [...relationsOf(ctx, id), oddOneOut(ctx, id), trueFalse(ctx, id)].filter(isQuestion);
}

/** Every question a session may ask to practise `id` — both families. */
export function questionsFor(ctx: QuizContext, id: string): Question[] {
  if (!ctx.g.byId.has(id)) return [];
  return [definitionOf(ctx, id), meaningOf(ctx, id), ...questionsAbout(ctx, id)].filter(isQuestion);
}
