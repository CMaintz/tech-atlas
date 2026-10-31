import { describe, expect, it } from 'vitest';
import { timeLanes } from '../graph-layout';
import { EXPLORER } from '../explorer-config';
import { freeSlot } from './time-lanes';
import { term } from './test-fixtures';

describe('timeLanes', () => {
  const nodes = [
    term('a', { domain: 'security', cluster: 'fundamentals', depth: 0, era: 1995 }),
    term('b', { domain: 'security', cluster: 'fundamentals', depth: 0, era: 1995 }),
    term('c', { domain: 'cs', cluster: 'networking', depth: 0, era: 2010 }),
    term('u', { domain: 'cs', cluster: 'networking', depth: 0 }),
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
    const years = [1950, 1960, 1970, 1990, 2000];
    const x = timeLanes(
      years.map((era) => term(`y${era}`, { domain: 'cs', cluster: 'web', depth: 0, era })),
    ).positions;
    expect(x.y1970.x - x.y1960.x).toBeLessThan(x.y2000.x - x.y1990.x);
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

describe('timeLanes ticks', () => {
  it('ticks every tickEvery years from the first round year, at one height', () => {
    const every = EXPLORER.time.tickEvery;
    const eras = [every * 197 + 1, every * 198, every * 200];
    const { ticks, positions } = timeLanes(
      eras.map((era) => term(`y${era}`, { domain: 'cs', cluster: 'web', depth: 0, era })),
    );
    expect(ticks.map((t) => Number(t.label))).toEqual([every * 198, every * 199, every * 200]);
    expect(new Set(ticks.map((t) => t.y)).size).toBe(1);
    // Under the lanes, not over them.
    expect(ticks[0].y).toBeGreaterThan(Math.max(...Object.values(positions).map((p) => p.y)));
    expect(ticks[0].x).toBe(positions[`y${every * 198}`].x);
  });
});
