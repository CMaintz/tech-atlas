import { describe, expect, it } from 'vitest';
import { buildGraph, type ModelTerm } from './graph-model';
import { indexGraph } from './quiz-graph';
import { distractors, multiple, type QuizContext } from './quiz-options';

const term = (id: string, cluster: string, edges: ModelTerm['edges'] = {}): ModelTerm => ({
  id,
  term: { en: id, da: `${id}-da` },
  domain: ['security'],
  cluster,
  edges,
});

// `guard` protects against `attack`; `shield` protects against `other-attack`, so
// `other-attack` plays the answer's role elsewhere. `variant` is a kind of `attack`.
const graph = buildGraph([
  term('guard', 'c', { mitigates: ['attack'] }),
  term('attack', 'c'),
  term('variant', 'c', { 'kind-of': ['attack'] }),
  term('shield', 'x', { mitigates: ['other-attack'] }),
  term('other-attack', 'x'),
  term('near-1', 'y'),
  term('near-2', 'y'),
  term('near-3', 'y'),
]);
const ctx: QuizContext = { g: indexGraph(graph), lang: 'en', rng: () => 0.5 };
const node = (id: string) => ctx.g.byId.get(id)!;

describe('distractors', () => {
  const wrong = distractors(ctx, node('attack'), new Set(['guard']), {
    type: 'mitigates',
    dir: 'out',
  }).map((n) => n.id);

  it('never offers the answer, an excluded term or a relative of the answer', () => {
    expect(wrong).toHaveLength(3);
    for (const id of ['attack', 'guard', 'variant']) expect(wrong).not.toContain(id);
  });

  it('ranks a term playing the same role above others', () => {
    expect(wrong[0]).toBe('other-attack');
  });
});

describe('multiple', () => {
  const base = { termId: 'guard', kind: 'relation' as const, prompt: 'p', answer: node('attack') };

  it('needs three wrong answers', () => {
    expect(multiple(ctx, { ...base, wrong: [node('near-1'), node('near-2')] })).toBeNull();
  });

  it('offers the answer among the options, labelled by name', () => {
    const q = multiple(ctx, { ...base, wrong: [node('near-1'), node('near-2'), node('near-3')] })!;
    expect(q.answer).toBe('attack');
    expect(q.options.map((o) => o.id).sort()).toEqual(['attack', 'near-1', 'near-2', 'near-3']);
    expect(q.options.find((o) => o.id === 'attack')!.label).toBe('attack');
  });
});
