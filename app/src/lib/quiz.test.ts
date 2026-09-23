import { describe, expect, it } from 'vitest';
import { buildGraph, type ModelTerm } from './graph-model';
import { makeQuizzer } from './quiz';

const term = (id: string, edges: ModelTerm['edges'] = {}): ModelTerm => ({
  id: `security/${id}`,
  term: { en: id, da: `${id}-da` },
  domain: ['security'],
  cluster: 'c',
  summary: { en: `summary of ${id}`, da: `resumé af ${id}` },
  edges,
});

const graph = buildGraph([
  term('base'),
  term('mid', { requires: ['base'] }),
  term('top', { requires: ['mid'], 'contrasts-with': ['other'], mitigates: ['attack'] }),
  term('child', { 'kind-of': ['top'] }),
  term('other'),
  term('attack'),
  term('p'),
  term('q'),
  term('r'),
  term('s'),
]);

/** Deterministic random source so tests are repeatable. */
const seeded =
  (seed = 1) =>
  () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

describe('makeQuizzer', () => {
  const quizzer = makeQuizzer(graph, 'en', seeded());
  const qs = quizzer.questionsFor('security/top');
  const byKind = (k: string) => qs.find((q) => q.kind === k)!;

  it('generates one question per available kind', () => {
    expect(qs.map((q) => q.kind).sort()).toEqual([
      'contrast',
      'definition',
      'prerequisite',
      'relation',
    ]);
  });

  it('always offers four distinct options including the answer', () => {
    for (const q of qs) {
      const ids = q.options.map((o) => o.id);
      expect(new Set(ids).size).toBe(4);
      expect(ids).toContain(q.answer);
    }
  });

  it('never uses a taxonomic relative as a definition distractor', () => {
    const q = byKind('definition');
    expect(q.answer).toBe('security/top');
    expect(q.options.map((o) => o.id)).not.toContain('security/child');
  });

  it('never offers another prerequisite or a dependant as a wrong answer', () => {
    const q = byKind('prerequisite');
    expect(q.answer).toBe('security/mid');
    const wrong = q.options.map((o) => o.id).filter((id) => id !== q.answer);
    expect(wrong).not.toContain('security/base');
    expect(wrong).not.toContain('security/top');
  });

  it('asks about authored security relationships', () => {
    expect(byKind('relation').answer).toBe('security/attack');
    expect(byKind('contrast').answer).toBe('security/other');
  });

  it('never offers a relative of the question term as a wrong answer', () => {
    // `child` is kind-of `top`, so it may not appear as a wrong option about `top`.
    for (const q of qs.filter((x) => x.kind !== 'definition')) {
      const wrong = q.options.map((o) => o.id).filter((id) => id !== q.answer);
      expect(wrong).not.toContain('security/child');
    }
  });

  it('localises labels', () => {
    const da = makeQuizzer(graph, 'da', seeded()).questionsFor('security/top');
    expect(da[0].options.every((o) => o.label.endsWith('-da'))).toBe(true);
  });

  it('returns nothing for an unknown term', () => {
    expect(quizzer.questionsFor('security/nope')).toEqual([]);
  });
});
