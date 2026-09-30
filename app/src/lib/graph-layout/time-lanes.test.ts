import { describe, expect, it } from 'vitest';
import { timeLanes, yearX } from '../graph-layout';
import { EXPLORER } from '../explorer-config';
import { freeSlot, yearTicks } from './time-lanes';
import { term } from './test-fixtures';

describe('timeLanes', () => {
  const nodes = [
    term('a', 'security', 'fundamentals', 0, 1995),
    term('b', 'security', 'fundamentals', 0, 1995),
    term('c', 'cs', 'networking', 0, 2010),
    term('u', 'cs', 'networking', 0),
  ];
  const t = timeLanes(nodes);
  it('hides undated terms instead of piling them into a grid', () => {
    expect(t.hidden).toEqual(['u']);
    expect(t.positions.u).toBeUndefined();
  });
  it('orders by year and stacks terms of one year', () => {
    expect(t.positions.a.x).toBe(t.positions.b.x);
    expect(t.positions.a.y).not.toBe(t.positions.b.y);
    expect(t.positions.c.x).toBeGreaterThan(t.positions.a.x);
    expect(t.lanes.map((l) => l.domain)).toEqual(['security', 'cs']);
  });
  it('compresses the sparse early years', () => {
    expect(yearX(1970, 1950) - yearX(1960, 1950)).toBeLessThan(
      yearX(2000, 1950) - yearX(1990, 1950),
    );
  });
});

describe('freeSlot', () => {
  const gap = EXPLORER.time.stackGap;
  it('takes the lowest slot clear of every term within a column', () => {
    expect(freeSlot([], 0)).toBe(0);
    expect(freeSlot([{ x: 0, y: 0 }], 0)).toBe(1);
    expect(freeSlot([{ x: 0, y: 0 }], gap)).toBe(0);
    expect(
      freeSlot(
        [
          { x: 0, y: 0 },
          { x: 0, y: 2 * gap },
        ],
        0,
      ),
    ).toBe(1);
  });
});

describe('yearTicks', () => {
  it('ticks every tickEvery years from the first round year, at one height', () => {
    const every = EXPLORER.time.tickEvery;
    const ticks = yearTicks(every * 197 + 1, every * 200, 42);
    expect(ticks.map((t) => Number(t.label))).toEqual([every * 198, every * 199, every * 200]);
    expect(ticks.every((t) => t.y === 42)).toBe(true);
    expect(ticks[0].x).toBe(yearX(every * 198, every * 197 + 1));
  });
});
