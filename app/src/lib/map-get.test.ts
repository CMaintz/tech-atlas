import { describe, expect, it } from 'vitest';
import { getOrThrow } from './map-get';

describe('getOrThrow', () => {
  it('returns the stored value', () => {
    expect(getOrThrow(new Map([['a', 0]]), 'a', 'test')).toBe(0);
  });

  it('throws naming the missing key', () => {
    expect(() => getOrThrow(new Map<string, number>(), 'b', 'track')).toThrow(
      'track: no entry for b',
    );
  });
});
