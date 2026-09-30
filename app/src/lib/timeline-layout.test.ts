import { describe, expect, it } from 'vitest';
import { lanesOf, stretchScale, yearLoad } from './timeline';
import {
  CHIP_W,
  LABEL_COL,
  LANE_PAD,
  ROW,
  ROW_FIT,
  V_ITEM,
  groupChips,
  horizontalLayout,
  labelSpan,
  verticalLayout,
  type ChartItem,
} from './timeline-layout';

const item = (id: string, year: number, domain: string, hub = false, degree = 1): ChartItem => ({
  id,
  name: `Term ${id}`,
  year,
  domain: [domain],
  home: domain,
  degree,
  hub,
});

describe('labelSpan', () => {
  const scale = stretchScale(2000, 2010, 50, () => 0); // 500px, 50px a year
  it('puts the label right of its dot, hubs first', () => {
    const { span, flip } = labelSpan(item('a', 2001, 'x', true), scale, 12);
    expect(flip).toBe(false);
    expect(span.start).toBe(75 - 7);
    expect(span.rank).toBeLessThan(labelSpan(item('b', 2001, 'x', false, 9), scale, 12).span.rank);
  });
  it('flips the label left of its dot near the right edge', () => {
    const { span, flip } = labelSpan(item('a', 2009, 'x'), scale, 12);
    expect(flip).toBe(true);
    expect(span.end).toBe(475 + 7);
    expect(span.start).toBeLessThan(475);
  });
});

describe('groupChips', () => {
  it('merges overflowed terms closer than a chip width, in axis order', () => {
    const chips = groupChips('sec', [
      { id: 'c', x: 100 + CHIP_W },
      { id: 'a', x: 100 },
      { id: 'b', x: 100 + CHIP_W - 1 },
    ]);
    expect(chips).toEqual([
      { key: 'sec:a', x: 100, ids: ['a', 'b'] },
      { key: 'sec:c', x: 100 + CHIP_W, ids: ['c'] },
    ]);
  });
});

describe('horizontalLayout', () => {
  const items = [
    ...Array.from({ length: 30 }, (_, i) => item(`s${i}`, 2015, 'sec', i === 0)),
    item('n1', 1990, 'net'),
  ];
  const lanes = lanesOf(items, ['sec', 'net']);
  const axis = { start: 1990, end: 2020, zoom: 0, load: yearLoad(lanes.values()) };

  it('fits the axis to the available width at zoom 0', () => {
    const h = horizontalLayout(lanes, axis, 1280, 560);
    expect(h.width).toBeCloseTo(1280 - LABEL_COL - 2, 0);
    expect(h.row).toBe(ROW_FIT);
    expect(horizontalLayout(lanes, { ...axis, zoom: 1 }, 1280, 560).row).toBe(ROW);
  });
  it('places every term once, in a row or a chip, within the height budget', () => {
    const h = horizontalLayout(lanes, axis, 1280, 200);
    const sec = h.lanes[0];
    const shown = sec.list.map((it) => it.id);
    const chipped = sec.chips.flatMap((c) => c.ids);
    expect([...shown, ...chipped].sort()).toEqual(
      items
        .slice(0, 30)
        .map((i) => i.id)
        .sort(),
    );
    expect(chipped.length).toBeGreaterThan(0);
    expect(shown).toContain('s0'); // the hub keeps its row
    expect(sec.chipRow).toBe((sec.height - LANE_PAD * 2) / h.row - 1);
    expect(h.lanes.reduce((n, l) => n + l.height, 0)).toBeLessThanOrEqual(200 + 2 * h.row);
  });
});

describe('verticalLayout', () => {
  it('stacks same-year terms one row apart, per lane', () => {
    const items = [item('a', 2000, 'x'), item('b', 2000, 'x'), item('c', 2000, 'y')];
    const lanes = lanesOf(items, ['x', 'y']);
    const v = verticalLayout(lanes, {
      start: 2000,
      end: 2010,
      zoom: 0,
      load: yearLoad(lanes.values()),
    });
    expect(v.pos.get('b')! - v.pos.get('a')!).toBe(V_ITEM);
    expect(v.pos.get('c')).toBe(v.pos.get('a'));
    expect(v.scale.at(2001)).toBe(2 * V_ITEM + 4);
  });
});
