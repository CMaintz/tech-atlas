import { describe, expect, it } from 'vitest';
import { loadTerms } from '../../scripts/load-terms';
import { buildGraph, prerequisitesOf, type Graph, type ModelTerm } from './graph-model';
import type { Learner } from './learner';
import { buildSession, makeQuizzer, type Question } from './quiz';

const term = (id: string, edges: ModelTerm['edges'] = {}, cluster = 'c'): ModelTerm => ({
  id: `security/${id}`,
  term: { en: id, da: `${id}-da` },
  domain: ['security'],
  cluster,
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
  term('attack2'),
  term('guard', { mitigates: ['attack2'] }),
  term('p'),
  term('q'),
  term('r'),
  term('s'),
  term('far', {}, 'elsewhere'),
]);

/** Deterministic random source so tests are repeatable. */
const seeded =
  (seed = 1) =>
  () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

const ids = (q: Question) => q.options.map((o) => o.id);
const wrongOf = (q: Question) => ids(q).filter((id) => id !== q.answer);
const edgeBetween = (g: Graph, a: string, b: string) =>
  g.links.some((l) => (l.source === a && l.target === b) || (l.source === b && l.target === a));

describe('questions about a term', () => {
  const quizzer = makeQuizzer(graph, 'en', seeded());
  const qs = quizzer.questionsAbout('security/top');
  const relation = (prompt: string) => qs.find((q) => q.prompt.startsWith(prompt))!;

  it('are never answered by the term itself', () => {
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) {
      expect(q.answer).not.toBe('security/top');
      expect(ids(q)).not.toContain('security/top');
    }
  });

  it('ask about each relationship in both directions', () => {
    expect(relation('What should you understand before').answer).toBe('security/mid');
    expect(relation('Which of these builds on')).toBeUndefined(); // nothing requires top
    expect(relation('Which of these is a kind of').answer).toBe('security/child');
    expect(relation('What does top help protect against').answer).toBe('security/attack');
    expect(relation('Which of these is easily confused').answer).toBe('security/other');
    const guard = makeQuizzer(graph, 'en', seeded()).questionsAbout('security/attack2');
    expect(guard.find((q) => q.prompt.startsWith('What helps protect'))!.answer).toBe(
      'security/guard',
    );
  });

  it('never offer another prerequisite, a dependant or any neighbour as a wrong answer', () => {
    const q = relation('What should you understand before');
    for (const bad of ['security/base', 'security/child', 'security/other', 'security/attack'])
      expect(wrongOf(q)).not.toContain(bad);
  });

  it('prefer wrong answers that play the same role elsewhere', () => {
    // "What does top protect against?" — attack2 is also protected against, by guard.
    expect(wrongOf(relation('What does top help protect against'))).toContain('security/attack2');
  });

  it('offer four distinct options including the answer', () => {
    for (const q of qs.filter((x) => x.kind !== 'true-false')) {
      expect(new Set(ids(q)).size).toBe(4);
      expect(ids(q)).toContain(q.answer);
    }
  });

  it('odd-one-out: three neighbours and one unconnected term', () => {
    const q = qs.find((x) => x.kind === 'odd-one-out')!;
    expect(q.prompt).toBe('Which of these is NOT related to top?');
    expect(edgeBetween(graph, 'security/top', q.answer)).toBe(false);
    for (const id of wrongOf(q)) expect(edgeBetween(graph, 'security/top', id)).toBe(true);
  });

  it('true/false: a relationship statement, false only by reversing it', () => {
    for (let seed = 1; seed < 30; seed++) {
      const q = makeQuizzer(graph, 'en', seeded(seed))
        .questionsAbout('security/top')
        .find((x) => x.kind === 'true-false')!;
      expect(ids(q)).toEqual(['true', 'false']);
      const s = q.prompt;
      const truth = s.includes('understand mid before top') || s.includes('child is a kind of top');
      const reversed =
        s.includes('understand top before mid') || s.includes('top is a kind of child');
      expect(truth || reversed).toBe(true);
      expect(q.answer).toBe(truth ? 'true' : 'false');
    }
  });

  it('localises prompts and labels', () => {
    const da = makeQuizzer(graph, 'da', seeded()).questionsAbout('security/top');
    for (const q of da.filter((x) => x.kind !== 'true-false'))
      expect(q.options.every((o) => o.label.endsWith('-da'))).toBe(true);
    expect(da.some((q) => q.prompt.startsWith('Hvad bør du forstå før'))).toBe(true);
  });

  it('returns nothing for an unknown term', () => {
    expect(quizzer.questionsAbout('security/nope')).toEqual([]);
    expect(quizzer.pageQuestions('security/nope')).toEqual([]);
  });
});

describe('questions answered by a term', () => {
  const qs = makeQuizzer(graph, 'en', seeded()).questionsFor('security/top');

  it('definition → term, never offering a structural relative', () => {
    const q = qs.find((x) => x.kind === 'definition')!;
    expect(q.answer).toBe('security/top');
    expect(q.prompt).toContain('summary of top');
    expect(ids(q)).not.toContain('security/child');
  });

  it('term → definition, with summaries as options', () => {
    const q = qs.find((x) => x.kind === 'meaning')!;
    expect(q.prompt).toBe('What does top mean?');
    expect(q.options.find((o) => o.id === q.answer)!.label).toBe('summary of top');
    expect(q.options.every((o) => o.label.startsWith('summary of '))).toBe(true);
  });
});

describe('a term page', () => {
  it('shows its neighbours’ definitions but never its own', () => {
    for (let seed = 1; seed < 20; seed++) {
      const qs = makeQuizzer(graph, 'en', seeded(seed)).pageQuestions('security/top', 20);
      expect(qs.some((q) => q.kind === 'definition' || q.kind === 'meaning')).toBe(true);
      for (const q of qs) {
        expect(q.answer).not.toBe('security/top');
        expect(ids(q)).not.toContain('security/top');
        expect(q.prompt).not.toContain('summary of top');
      }
    }
  });

  it('mixes kinds in a short check', () => {
    const qs = makeQuizzer(graph, 'en', seeded()).pageQuestions('security/top', 3);
    expect(qs).toHaveLength(3);
    expect(new Set(qs.map((q) => q.kind)).size).toBe(3);
  });
});

describe('buildSession', () => {
  const learner: Learner = {
    terms: {
      'security/mid': { box: 1, due: 0, right: 0, wrong: 1 },
      'security/attack': { box: 4, due: 9e15, right: 5, wrong: 0, status: 'learning' },
      'security/base': { box: 5, due: 9e15, right: 5, wrong: 0 },
    },
  };

  it('draws weak terms only for "weak"', () => {
    const qs = buildSession(graph, learner, 'weak', makeQuizzer(graph, 'en', seeded()), 10, 1);
    expect(new Set(qs.map((q) => q.termId))).toEqual(new Set(['security/mid', 'security/attack']));
  });

  it('draws one cluster or one domain', () => {
    const q = makeQuizzer(graph, 'en', seeded());
    expect(buildSession(graph, learner, 'cluster:elsewhere', q).map((x) => x.termId)).toEqual([
      'security/far',
    ]);
    expect(buildSession(graph, learner, 'domain:ai', q)).toEqual([]);
    expect(buildSession(graph, learner, 'domain:security', q, 5)).toHaveLength(5);
  });

  it('puts due reviews first and mixes question kinds', () => {
    const qs = buildSession(graph, learner, 'all', makeQuizzer(graph, 'en', seeded()), 8, 1);
    expect(qs[0].termId).toBe('security/mid');
    expect(new Set(qs.map((q) => q.kind)).size).toBeGreaterThanOrEqual(3);
  });
});

describe('on the real map', () => {
  const { terms } = loadTerms();
  const real = buildGraph([...terms.entries()].map(([id, t]) => ({ ...t, id }) as ModelTerm));
  const byId = new Map(real.nodes.map((n) => [n.id, n]));
  const quizzer = makeQuizzer(real, 'en', seeded(7));

  it('no term page ever asks a question answered by that term', () => {
    for (const n of real.nodes) {
      for (const q of quizzer.pageQuestions(n.id, 50)) {
        expect(q.answer, `${n.id}: ${q.prompt}`).not.toBe(n.id);
        expect(ids(q)).not.toContain(n.id);
        if (n.summary) expect(q.prompt).not.toContain(n.summary.en);
      }
    }
  });

  it('OAuth’s definition is asked on the access-control page', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed < 40; seed++)
      for (const q of makeQuizzer(real, 'en', seeded(seed)).pageQuestions('cs/access-control', 50))
        seen.add(q.answer);
    expect(seen).toContain('cs/oauth');
  });

  it('distractors are valid: distinct, never a right answer, never a neighbour', () => {
    for (const n of real.nodes) {
      const near = new Set(
        real.links.flatMap((l) =>
          l.source === n.id ? [l.target] : l.target === n.id ? [l.source] : [],
        ),
      );
      const pre = new Set(prerequisitesOf(real, n.id).map((p) => p.id));
      for (const q of quizzer.questionsAbout(n.id)) {
        expect(new Set(ids(q)).size).toBe(q.options.length);
        expect(ids(q)).toContain(q.answer);
        if (q.kind === 'true-false') continue;
        const wrong = wrongOf(q);
        if (q.kind === 'odd-one-out') {
          expect(near.has(q.answer)).toBe(false);
          for (const id of wrong) expect(near.has(id)).toBe(true);
          continue;
        }
        expect(near.has(q.answer)).toBe(true);
        for (const id of wrong) {
          expect(near.has(id), `${n.id}: ${q.prompt} → ${id}`).toBe(false);
          if (q.prompt.startsWith('What should you understand')) expect(pre.has(id)).toBe(false);
          expect(byId.get(id)).toBeDefined();
        }
      }
    }
  });
});
