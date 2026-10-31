import { describe, expect, it } from 'vitest';
import { pageRank } from '../graph-layout';

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
  it('ignores links with an end outside the ranked terms', () => {
    const links = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c', directed: false },
    ];
    const r = pageRank(['a', 'b', 'c'], links);
    expect(pageRank(['a', 'b', 'c'], [...links, { source: 'c', target: 'nowhere' }])).toEqual(r);
    expect(pageRank(['a', 'b', 'c'], [{ source: 'nowhere', target: 'a' }, ...links])).toEqual(r);
  });
});
