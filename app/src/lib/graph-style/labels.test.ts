import { describe, expect, it } from 'vitest';
import { cullLabels, labelAbove, labelBelow, outerSide } from '../graph-style';

describe('cullLabels', () => {
  const box = (id: string, x: number, y: number, w = 40, h = 10) => ({
    id,
    x1: x,
    y1: y,
    x2: x + w,
    y2: y + h,
  });
  it('keeps higher-priority labels and hides any that would overlap them', () => {
    const hidden = cullLabels([box('hub', 0, 0), box('leaf', 20, 5), box('far', 100, 0)]);
    expect([...hidden]).toEqual(['leaf']);
  });
  it('treats blockers (cluster names) as already placed', () => {
    const hidden = cullLabels([box('a', 0, 0)], [{ x1: 10, y1: 0, x2: 30, y2: 10 }]);
    expect(hidden.has('a')).toBe(true);
  });
  it('never leaves two kept labels overlapping', () => {
    const labels = Array.from({ length: 60 }, (_, i) =>
      box(`n${i}`, (i * 37) % 200, (i * 13) % 90),
    );
    const hidden = cullLabels(labels);
    const kept = labels.filter((l) => !hidden.has(l.id));
    for (const a of kept)
      for (const b of kept)
        if (a !== b) expect(a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2).toBe(false);
  });
});

describe('outerSide', () => {
  it('names a region on the side facing away from the map centre', () => {
    const c = { x: 0, y: 0 };
    expect(outerSide({ x1: -50, y1: -400, x2: 50, y2: -200 }, c)).toBe('top');
    expect(outerSide({ x1: -50, y1: 200, x2: 50, y2: 400 }, c)).toBe('bottom');
    expect(outerSide({ x1: 200, y1: -50, x2: 400, y2: 50 }, c)).toBe('right');
    expect(outerSide({ x1: -400, y1: -50, x2: -200, y2: 50 }, c)).toBe('left');
  });
});

describe('label boxes', () => {
  it('puts a node label below the node and a region label above its point', () => {
    const below = labelBelow({ x: 0, y: 0 }, 20, 40, 10);
    expect(below.y1).toBeGreaterThan(8);
    expect(below.x2 - below.x1).toBeGreaterThanOrEqual(40);
    const above = labelAbove({ x: 0, y: 0 }, 40, 10);
    expect(above.y2).toBeLessThanOrEqual(4);
    expect(above.y1).toBeLessThan(-10);
  });
});
