import { describe, expect, it } from 'vitest';
import { decadeOf, groupByDecade, timePositions } from './era';

describe('decadeOf', () => {
  it('floors a year to its decade', () => {
    expect(decadeOf(1995)).toBe(1990);
    expect(decadeOf(2000)).toBe(2000);
    expect(decadeOf(2009)).toBe(2000);
  });
});

describe('groupByDecade', () => {
  const items = [
    { id: 'tls', era: 1999 },
    { id: 'ssl', era: 1995 },
    { id: 'aes', era: 2001 },
    { id: 'des', era: 1977 },
    { id: 'rsa', era: 1977 },
    { id: 'mfa' },
    { id: 'phishing' },
  ];

  it('groups dated terms by decade, oldest first', () => {
    const { decades } = groupByDecade(items);
    expect(decades.map((d) => d.decade)).toEqual([1970, 1990, 2000]);
  });

  it('orders within a decade by year, then by name', () => {
    const { decades } = groupByDecade(items);
    expect(decades[0].items.map((t) => t.id)).toEqual(['des', 'rsa']);
    expect(decades[1].items.map((t) => t.id)).toEqual(['ssl', 'tls']);
  });

  it('uses the given name for ties', () => {
    const { decades } = groupByDecade(items, (t) => (t.id === 'rsa' ? 'a' : 'z'));
    expect(decades[0].items.map((t) => t.id)).toEqual(['rsa', 'des']);
  });

  it('counts undated terms instead of placing them', () => {
    const { decades, undated } = groupByDecade(items);
    expect(undated).toBe(2);
    expect(decades.flatMap((d) => d.items)).toHaveLength(5);
  });

  it('handles a corpus with no eras at all', () => {
    expect(groupByDecade([{ id: 'a' }, { id: 'b' }])).toEqual({ decades: [], undated: 2 });
  });
});

describe('timePositions', () => {
  it('places x by year, earliest at 0', () => {
    const p = timePositions(
      [
        { id: 'a', era: 1990 },
        { id: 'b', era: 2000 },
      ],
      { pxPerYear: 10 },
    );
    expect(p.a.x).toBe(0);
    expect(p.b.x).toBe(100);
  });

  it('stacks same-year terms around y = 0', () => {
    const p = timePositions(
      [
        { id: 'a', era: 1990 },
        { id: 'b', era: 1990 },
      ],
      { rowGap: 50 },
    );
    expect(p.a.x).toBe(p.b.x);
    expect([p.a.y, p.b.y]).toEqual([-25, 25]);
  });

  it('parks undated terms in a lane left of the earliest year', () => {
    const p = timePositions([{ id: 'a', era: 1990 }, { id: 'x' }, { id: 'y' }, { id: 'z' }]);
    for (const id of ['x', 'y', 'z']) expect(p[id].x).toBeLessThan(p.a.x);
    const spots = new Set(['x', 'y', 'z'].map((id) => `${p[id].x},${p[id].y}`));
    expect(spots.size).toBe(3);
  });

  it('never produces NaN, even with no dated terms', () => {
    const p = timePositions([{ id: 'x' }, { id: 'y' }]);
    for (const { x, y } of Object.values(p)) {
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
    }
    expect(timePositions([])).toEqual({});
  });
});
