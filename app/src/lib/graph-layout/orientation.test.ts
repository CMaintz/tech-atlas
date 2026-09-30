import { describe, expect, it } from 'vitest';
import { levelAngle, rotateAbout } from '../graph-layout';

describe('levelAngle / rotateAbout', () => {
  it('rotates a point about a centre', () => {
    const p = rotateAbout({ x: 2, y: 1 }, { x: 1, y: 1 }, Math.PI / 2);
    expect(p.x).toBeCloseTo(1);
    expect(p.y).toBeCloseTo(2);
  });
  it('levels a tall cloud so its long axis is horizontal', () => {
    const tall = [
      { x: 0, y: -100 },
      { x: 5, y: 0 },
      { x: 0, y: 100 },
    ];
    const a = levelAngle(tall);
    const turned = tall.map((p) => rotateAbout(p, { x: 0, y: 0 }, a));
    const w = Math.max(...turned.map((p) => p.x)) - Math.min(...turned.map((p) => p.x));
    const h = Math.max(...turned.map((p) => p.y)) - Math.min(...turned.map((p) => p.y));
    expect(w).toBeGreaterThan(h);
  });
});
