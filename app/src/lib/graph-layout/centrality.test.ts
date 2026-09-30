import { describe, expect, it } from 'vitest';
import { pageRank } from '../graph-layout';
import { outNeighbours } from './centrality';

describe('pageRank', () => {
  it('ranks what many terms point at highest, normalised to 1', () => {
    const r = pageRank(
      ['a', 'b', 'c', 'hub'],
      [
        { source: 'a', target: 'hub' },
        { source: 'b', target: 'hub' },
        { source: 'c', target: 'hub' },
      ],
    );
    expect(r.get('hub')).toBe(1);
    expect(r.get('a')!).toBeLessThan(1);
  });
  it('counts symmetric relationships both ways', () => {
    const r = pageRank(['a', 'b'], [{ source: 'a', target: 'b', directed: false }]);
    expect(r.get('a')).toBeCloseTo(r.get('b')!);
  });
});

describe('outNeighbours', () => {
  it('follows the authored direction, both ways for symmetric links, and skips unknown ends', () => {
    const out = outNeighbours(
      ['a', 'b', 'c'],
      [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c', directed: false },
        { source: 'c', target: 'nowhere' },
      ],
    );
    expect(out).toEqual([[1], [2], [1]]);
  });
});
