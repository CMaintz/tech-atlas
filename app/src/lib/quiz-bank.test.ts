import { describe, expect, it } from 'vitest';
import type { ClientQuestion } from './question-rules';
import { bankFor, fromBank, indexBank } from './quiz-bank';

const cq = (over: Partial<ClientQuestion> = {}): ClientQuestion => ({
  id: 'q1',
  terms: ['s/a', 's/b'],
  kind: 'scenario',
  stem: 'stem',
  options: ['one', 'two', 'three', 'four'],
  answer: 2,
  explanation: 'why',
  difficulty: 1,
  answeredBy: [],
  ...over,
});

describe('indexBank / bankFor', () => {
  const bank = indexBank([
    cq(),
    cq({ id: 'q2', terms: ['s/a'], answeredBy: ['s/a'] }),
    cq({ id: 'q3', terms: ['s/c'] }),
  ]);

  it('finds every question that tests a term', () => {
    expect(bankFor(bank, 's/a').map((q) => q.id)).toEqual(['q1', 'q2']);
    expect(bankFor(bank, 's/b').map((q) => q.id)).toEqual(['q1']);
    expect(bankFor(bank, 's/x')).toEqual([]);
  });

  it('on a term page, leaves out questions the term itself answers', () => {
    expect(bankFor(bank, 's/a', true).map((q) => q.id)).toEqual(['q1']);
  });
});

describe('fromBank', () => {
  const reverse = () => 0.999;

  it('keeps the answer on its option through the shuffle', () => {
    const q = fromBank(reverse, cq());
    expect(q.options.find((o) => o.id === q.answer)!.label).toBe('three');
    expect(q).toMatchObject({
      termId: 's/a',
      termIds: ['s/a', 's/b'],
      bankId: 'q1',
      explanation: 'why',
    });
  });

  it('never shuffles true/false', () => {
    const q = fromBank(reverse, cq({ kind: 'true-false', options: ['True', 'False'], answer: 0 }));
    expect(q.options.map((o) => o.label)).toEqual(['True', 'False']);
  });

  it('links to the term the answer names, else another tested term', () => {
    expect(fromBank(reverse, cq({ answeredBy: ['s/b'] })).link).toBe('s/b');
    expect(fromBank(reverse, cq(), 's/a').link).toBe('s/b');
    expect(fromBank(reverse, cq(), 's/b').link).toBe('s/a');
    expect(fromBank(reverse, cq({ terms: ['s/a'] })).link).toBe('s/a');
  });
});
