import { describe, expect, it } from 'vitest';
import { startHistory, travel, visit } from './panel-nav';

describe('panel history (Back / Forward)', () => {
  it('visits push, and re-visiting the current term is a no-op', () => {
    const h = visit(visit(startHistory('a'), 'b'), 'b');
    expect(h).toEqual({ entries: ['a', 'b'], pos: 1 });
  });

  it('goes back and forward, and stops at the ends', () => {
    const h = visit(visit(startHistory('a'), 'b'), 'c');
    const back = travel(h, -1)!;
    expect(back.id).toBe('b');
    expect(travel(travel(back.history, -1)!.history, -1)).toBeNull();
    expect(travel(back.history, 1)!.id).toBe('c');
    expect(travel(h, 1)).toBeNull();
  });

  it('drops the forward trail on a new visit, like a browser', () => {
    const h = visit(visit(startHistory('a'), 'b'), 'c');
    const back = travel(travel(h, -1)!.history, -1)!.history;
    expect(visit(back, 'd')).toEqual({ entries: ['a', 'd'], pos: 1 });
  });

  it('remembers at most the limit', () => {
    let h = startHistory('t0');
    for (let k = 1; k < 10; k++) h = visit(h, `t${k}`, 3);
    expect(h).toEqual({ entries: ['t7', 't8', 't9'], pos: 2 });
  });
});
