import { prerequisitesOf, type GraphNode } from './graph-model';
import {
  closure,
  edgesOf,
  ends,
  kin,
  mentioned,
  neighbours,
  nodeOf,
  type Edge,
  type QuizGraph,
  type Relation,
} from './quiz-graph';
import { distractors, isQuestion, multiple, nameOf, type QuizContext } from './quiz-options';
import { pick, shuffle } from './quiz-random';
import { ASK, STATE, SYMMETRIC, T, TRANSITIVE } from './quiz-text';
import type { Dir, Lang, Question } from './quiz-types';

type About = { id: string; offLimits: string[] };
type AskedRelation = Relation & { ask: Record<Lang, (x: string) => string> };
type Statable = { edge: Edge; say: Record<Lang, (a: string, b: string) => string> };

function summaryIn(n: GraphNode, lang: Lang) {
  if (!n.summary) throw new Error(`term has no summary: ${n.id}`);
  return n.summary[lang];
}

export function definitionOf(ctx: QuizContext, id: string, avoid = new Set<string>()) {
  const t = ctx.g.byId.get(id);
  if (!t?.summary) return null;
  const wrong = distractors(ctx, t, { exclude: avoid });
  const prompt = T.definition[ctx.lang](t.summary[ctx.lang]);
  return multiple(ctx, { termId: id, kind: 'definition', prompt, answer: t, wrong });
}

export function meaningOf(ctx: QuizContext, id: string, avoid = new Set<string>()) {
  const t = ctx.g.byId.get(id);
  if (!t?.summary) return null;
  const wrong = distractors(ctx, t, { exclude: avoid, filter: (n) => !!n.summary });
  const prompt = T.meaning[ctx.lang](nameOf(ctx, t));
  const label = (n: GraphNode) => summaryIn(n, ctx.lang);
  return multiple(ctx, { termId: id, kind: 'meaning', prompt, answer: t, wrong, label });
}

function alsoRight(g: QuizGraph, about: About, rel: Relation & { valid: string[] }) {
  const { id } = about;
  const exclude = new Set([id, ...about.offLimits, ...rel.valid]);
  if (TRANSITIVE.has(rel.type)) for (const c of closure(g, id, rel)) exclude.add(c);
  if (rel.type === 'requires') {
    for (const p of prerequisitesOf(g.graph, id)) exclude.add(p.id);
    for (const d of closure(g, id, { type: 'requires', dir: 'in' })) exclude.add(d);
  }
  return exclude;
}

function relationQuestion(ctx: QuizContext, about: About, rel: AskedRelation) {
  const { g, lang } = ctx;
  const { type, dir } = rel;
  const valid = ends(g, about.id, rel);
  const answer = nodeOf(g, pick(valid, ctx.rng));
  const exclude = alsoRight(g, about, { type, dir, valid });
  const wrong = distractors(ctx, answer, { exclude, role: { type, dir } });
  const prompt = rel.ask[lang](nameOf(ctx, nodeOf(g, about.id)));
  return multiple(ctx, { termId: about.id, kind: 'relation', prompt, answer, wrong });
}

function relationsOf(ctx: QuizContext, id: string): Question[] {
  const { g } = ctx;
  const near = [...neighbours(g, id)];
  const offLimits = [...near, ...near.flatMap((n) => kin(g, n)), ...mentioned(g, id)];
  const seen = new Set<string>();
  const qs: (Question | null)[] = [];
  for (const e of shuffle(edgesOf(g, id), ctx.rng)) {
    const dir: Dir = SYMMETRIC.has(e.type) ? 'out' : e.dir;
    const key = `${e.type}:${dir}`;
    const ask = ASK[e.type]?.[dir];
    if (!ask || seen.has(key)) continue;
    seen.add(key);
    qs.push(relationQuestion(ctx, { id, offLimits }, { type: e.type, dir, ask }));
  }
  return qs.filter(isQuestion);
}

function unrelatedTo(ctx: QuizContext, id: string, near: string[]) {
  const { g } = ctx;
  const twoSteps = near.flatMap((n) => [...neighbours(g, n)]);
  const exclude = new Set([id, ...near, ...twoSteps, ...mentioned(g, id)]);
  const [odd] = distractors(ctx, nodeOf(g, id), { exclude }).filter(
    (n) => !mentioned(g, n.id).includes(id),
  );
  return odd;
}

function oddOneOut(ctx: QuizContext, id: string): Question | null {
  const { g, lang } = ctx;
  const near = [...neighbours(g, id)];
  if (near.length < 3) return null;
  const shown = shuffle(near, ctx.rng).slice(0, 3);
  const odd = unrelatedTo(ctx, id, near);
  if (!odd) return null;
  const label = (x: string) => nameOf(ctx, nodeOf(g, x));
  return {
    termId: id,
    kind: 'odd-one-out',
    prompt: T.odd[lang](nameOf(ctx, nodeOf(g, id))),
    answer: odd.id,
    link: odd.id,
    options: shuffle([odd.id, ...shown], ctx.rng).map((x) => ({ id: x, label: label(x) })),
  };
}

const joinedBothWays = (g: QuizGraph, id: string, e: Edge) =>
  edgesOf(g, id).some((f) => f.type === e.type && f.other === e.other && f.dir !== e.dir);

const statable = (g: QuizGraph, id: string): Statable[] =>
  edgesOf(g, id).flatMap((edge) => {
    const say = STATE[edge.type];
    return say && !joinedBothWays(g, id, edge) ? [{ edge, say }] : [];
  });

function statement(ctx: QuizContext, id: string, fact: Statable & { truth: boolean }) {
  const { edge, say, truth } = fact;
  const [from, to] = edge.dir === 'out' ? [id, edge.other] : [edge.other, id];
  const [a, b] = truth ? [from, to] : [to, from];
  const named = (x: string) => nameOf(ctx, nodeOf(ctx.g, x));
  return say[ctx.lang](named(a), named(b));
}

function trueFalse(ctx: QuizContext, id: string): Question | null {
  const usable = statable(ctx.g, id);
  if (!usable.length) return null;
  const fact = pick(usable, ctx.rng);
  const truth = ctx.rng() < 0.5;
  return {
    termId: id,
    kind: 'true-false',
    prompt: T.trueFalse[ctx.lang](statement(ctx, id, { ...fact, truth })),
    answer: truth ? 'true' : 'false',
    link: fact.edge.other,
    options: [
      { id: 'true', label: T.true[ctx.lang] },
      { id: 'false', label: T.false[ctx.lang] },
    ],
  };
}

export function questionsAbout(ctx: QuizContext, id: string): Question[] {
  if (!ctx.g.byId.has(id)) return [];
  return [...relationsOf(ctx, id), oddOneOut(ctx, id), trueFalse(ctx, id)].filter(isQuestion);
}

export function questionsFor(ctx: QuizContext, id: string): Question[] {
  if (!ctx.g.byId.has(id)) return [];
  return [definitionOf(ctx, id), meaningOf(ctx, id), ...questionsAbout(ctx, id)].filter(isQuestion);
}
