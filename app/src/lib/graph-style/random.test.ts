import { describe, expect, it } from 'vitest';
import { seededRandom, withSeededRandom } from '../graph-style';

describe('seeded randomness', () => {
  it('repeats for the same seed and stays in [0, 1)', () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    const xs = Array.from({ length: 50 }, () => a());
    expect(xs).toEqual(Array.from({ length: 50 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
  it('swaps Math.random only for the duration of the call, even on throw', () => {
    const original = Math.random;
    const first = withSeededRandom(1, () => [Math.random(), Math.random()]);
    expect(withSeededRandom(1, () => [Math.random(), Math.random()])).toEqual(first);
    expect(() =>
      withSeededRandom(1, () => {
        throw new Error('x');
      }),
    ).toThrow('x');
    expect(Math.random).toBe(original);
  });
});
