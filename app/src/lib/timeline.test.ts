import { describe, expect, it } from 'vitest';
import {
  axisRange,
  bandsWithin,
  decadeTicks,
  laneOf,
  lanesOf,
  densityScale,
  milestones,
  packTracks,
  packCapped,
  shareRows,
  fitPerYear,
  stretchScale,
  type Span,
  yearLoad,
  type TimelineItem,
} from './timeline';

const item = (id: string, year: number, domain: string[], degree = 1): TimelineItem => ({
  id,
  name: id,
  year,
  domain,
  home: domain[0],
  degree,
});

describe('axisRange and decadeTicks', () => {
  it('pads the data out to whole decades', () => {
    expect(axisRange([1956, 1974, 2025])).toEqual([1950, 2030]);
    expect(axisRange([1990])).toEqual([1990, 2000]);
    expect(axisRange([])).toEqual([2000, 2030]);
  });
  it('ticks every decade, inclusive', () => {
    expect(decadeTicks(1950, 1990)).toEqual([1950, 1960, 1970, 1980, 1990]);
    expect(decadeTicks(1955, 1975)).toEqual([1960, 1970]);
  });
});

describe('yearLoad and densityScale', () => {
  const lanes = [
    [{ year: 2000 }, { year: 2000 }, { year: 2001 }],
    [{ year: 2000 }, { year: 2003 }, { year: 2003 }, { year: 2003 }],
  ];
  it('takes the busiest lane per year', () => {
    expect([...yearLoad(lanes)].sort()).toEqual([
      [2000, 2],
      [2001, 1],
      [2003, 3],
    ]);
  });
  it('widens busy years, keeps empty ones short and stays in order', () => {
    const s = densityScale(2000, 2005, 20, yearLoad(lanes));
    const width = (y: number) => s.at(y + 1) - s.at(y);
    expect(width(2002)).toBe(9); // empty: 0.45 × 20
    expect(width(2001)).toBeCloseTo(28); // 20 × (0.8 + 0.6)
    expect(width(2003)).toBeCloseTo(52);
    expect(width(2003)).toBeGreaterThan(width(2000));
    expect(s.at(2000)).toBe(0);
    expect(s.length).toBeCloseTo(s.at(2005));
  });
});

describe('stretchScale', () => {
  it('gives empty years the minimum and crowded years room for their stack', () => {
    const s = stretchScale(2000, 2004, 5, (y) => (y === 2002 ? 60 : 0));
    expect(s.at(2000)).toBe(0);
    expect(s.at(2002)).toBe(10);
    expect(s.at(2003)).toBe(70);
    expect(s.length).toBe(75);
    expect(s.at(2002.5)).toBe(40);
  });
  it('is monotone', () => {
    const s = stretchScale(1950, 2030, 3, (y) => (y % 7) * 11);
    for (let y = 1950; y < 2030; y++) expect(s.at(y + 1)).toBeGreaterThanOrEqual(s.at(y));
  });
});

describe('packTracks', () => {
  const overlaps = (a: Span, b: Span, gap: number) =>
    a.start < b.end + gap && b.start < a.end + gap;

  it('puts non-overlapping spans on one track', () => {
    const { tracks } = packTracks([
      { id: 'a', start: 0, end: 10 },
      { id: 'b', start: 12, end: 20 },
    ]);
    expect(tracks).toBe(1);
  });

  it('stacks overlapping spans and honours the gap', () => {
    const spans = [
      { id: 'a', start: 0, end: 10 },
      { id: 'b', start: 5, end: 15 },
      { id: 'c', start: 12, end: 20 },
    ];
    const { track, tracks } = packTracks(spans, 4);
    expect(tracks).toBe(3);
    expect(track.get('a')).toBe(0);
    expect(track.get('b')).toBe(1);
    // c starts 2px after a ends, inside the 4px gap, so it can't reuse track 0.
    expect(track.get('c')).toBe(2);
  });

  it('never places two overlapping spans on the same track (randomised)', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31) * 1000;
    const spans: Span[] = Array.from({ length: 200 }, (_, i) => {
      const start = rnd();
      return { id: `t${i}`, start, end: start + 20 + (rnd() % 120) };
    });
    const { track, tracks } = packTracks(spans, 6);
    for (const a of spans)
      for (const b of spans)
        if (a !== b && track.get(a.id) === track.get(b.id)) expect(overlaps(a, b, 6)).toBe(false);
    // Greedy first-fit is optimal: tracks = max overlap at any span start.
    const depth = Math.max(
      ...spans.map((s) => spans.filter((o) => o.start <= s.start && s.start < o.end + 6).length),
    );
    expect(tracks).toBe(depth);
  });

  it('is deterministic regardless of input order', () => {
    const spans = [
      { id: 'b', start: 0, end: 10 },
      { id: 'a', start: 0, end: 10 },
    ];
    expect([...packTracks(spans).track]).toEqual([...packTracks([...spans].reverse()).track]);
    expect(packTracks(spans).track.get('a')).toBe(0);
  });
});

describe('lanes', () => {
  const items = [
    item('tls', 1999, ['cs', 'security']),
    item('rsa', 1977, ['cs']),
    item('gdpr', 2016, ['security']),
    item('llm', 2020, ['ai']),
  ];

  it('puts a term in its home lane, or its first shown domain when home is hidden', () => {
    expect(laneOf(items[0], ['cs', 'security'])).toBe('cs');
    expect(laneOf(items[0], ['security'])).toBe('security');
    expect(laneOf(items[3], ['security'])).toBeNull();
  });

  it('groups by lane in the order shown, each lane chronological', () => {
    const lanes = lanesOf(items, ['security', 'cs']);
    expect([...lanes.keys()]).toEqual(['security', 'cs']);
    expect(lanes.get('cs')!.map((i) => i.id)).toEqual(['rsa', 'tls']);
    expect(lanes.get('security')!.map((i) => i.id)).toEqual(['gdpr']);
  });
});

describe('milestones', () => {
  it('takes the most connected terms and at least the top hub of every domain', () => {
    const items = [
      ...Array.from({ length: 20 }, (_, i) => item(`s${i}`, 2000, ['security'], 30 - i)),
      item('c1', 1974, ['cs'], 3),
      item('c2', 1983, ['cs'], 2),
      item('z', 1990, ['ai'], 0),
    ];
    const m = milestones(items, 0.1);
    expect(m.has('s0')).toBe(true);
    expect(m.has('s1')).toBe(true);
    expect(m.has('s2')).toBe(true);
    expect(m.has('c1')).toBe(true); // the cs lane's biggest hub
    expect(m.has('c2')).toBe(false);
    expect(m.has('z')).toBe(false); // no connections, never a milestone
  });
});

describe('bandsWithin', () => {
  it('clips era bands to the axis', () => {
    const b = bandsWithin(1960, 2030);
    expect(b[0]).toMatchObject({ id: 'mainframe', from: 1960, to: 1975 });
    expect(b.at(-1)).toMatchObject({ id: 'ai', from: 2017, to: 2030 });
    expect(bandsWithin(1995, 2000).map((x) => x.id)).toEqual(['web']);
  });
});

describe('packCapped', () => {
  it('places high-priority spans first and overflows what does not fit', () => {
    const spans = [
      { id: 'a', start: 0, end: 10, rank: 1 },
      { id: 'b', start: 2, end: 12, rank: 1 },
      { id: 'hub', start: 4, end: 14, rank: 0 },
    ];
    const { track, tracks, overflow } = packCapped(spans, 2);
    expect(tracks).toBe(2);
    expect(track.get('hub')).toBe(0);
    expect(overflow).toEqual(['b']);
  });

  it('reuses gaps on earlier tracks', () => {
    const { track, overflow } = packCapped(
      [
        { id: 'x', start: 0, end: 5, rank: 0 },
        { id: 'y', start: 20, end: 30, rank: 0 },
        { id: 'z', start: 8, end: 15, rank: 1 },
      ],
      1,
      2,
    );
    expect(overflow).toEqual([]);
    expect(track.get('z')).toBe(0);
  });
});

describe('fitPerYear', () => {
  it('makes the density axis exactly the available width', () => {
    const load = new Map([
      [2000, 3],
      [2010, 1],
    ]);
    const p = fitPerYear(1990, 2020, 900, load);
    expect(densityScale(1990, 2020, p, load).length).toBeCloseTo(900);
  });
});

describe('shareRows', () => {
  it('gives sparse lanes what they need and the rest to busy ones', () => {
    expect(shareRows([2, 20, 3, 20], 24)).toEqual([2, 9, 3, 10]);
  });

  it('never hands out more than the total', () => {
    const out = shareRows([5, 5, 5], 7);
    expect(out.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(7);
  });
});
