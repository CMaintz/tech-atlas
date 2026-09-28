import { describe, expect, it } from 'vitest';
import { pick, shuffle, varied } from './quiz-random';
import type { Question, QuestionKind } from './quiz-types';

/** Deterministic random source so tests are repeatable. */
const seeded =
  (seed = 1) =>
  () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

const q = (kind: QuestionKind, n: number): Question => ({
  termId: `t${n}`,
  kind,
  prompt: `p${n}`,
  options: [],
  answer: '',
  link: '',
});

describe('shuffle', () => {
  it('returns a permutation and leaves the input alone', () => {
    const xs = [1, 2, 3, 4, 5, 6];
    const out = shuffle(xs, seeded());
    expect([...out].sort()).toEqual(xs);
    expect(xs).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('is repeatable for the same random source', () => {
    expect(shuffle([1, 2, 3, 4, 5], seeded(3))).toEqual(shuffle([1, 2, 3, 4, 5], seeded(3)));
  });
});

describe('pick', () => {
  it('maps the random number onto an index', () => {
    expect(pick(['a', 'b', 'c', 'd'], () => 0)).toBe('a');
    expect(pick(['a', 'b', 'c', 'd'], () => 0.99)).toBe('d');
  });
});

describe('varied', () => {
  it('takes one of each kind before a second of any', () => {
    const qs = [
      q('relation', 1),
      q('relation', 2),
      q('relation', 3),
      q('meaning', 4),
      q('odd-one-out', 5),
    ];
    const out = varied(qs, 3, seeded());
    expect(new Set(out.map((x) => x.kind)).size).toBe(3);
  });

  it('stops at n, or when the questions run out', () => {
    const qs = [q('relation', 1), q('meaning', 2)];
    expect(varied(qs, 1, seeded())).toHaveLength(1);
    expect(varied(qs, 5, seeded())).toHaveLength(2);
  });
});
