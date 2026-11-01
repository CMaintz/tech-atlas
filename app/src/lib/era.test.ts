import { describe, expect, it } from 'vitest';
import { decadeOf, groupByDecade } from './era';

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
