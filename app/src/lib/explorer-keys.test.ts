import { describe, expect, it } from 'vitest';
import { STILL, ease, isStill, navKey, targetAxes } from './explorer-keys';
import { EXPLORER } from './explorer-config';

const key = (code: string, key = '') => ({ code, key });

describe('navKey (A96)', () => {
  it('reads letters and arrows by physical key', () => {
    expect(navKey(key('KeyW', 'w'), '2d')).toBe('KeyW');
    expect(navKey(key('KeyW', 'W'), '3d')).toBe('KeyW');
    expect(navKey(key('ArrowLeft', 'ArrowLeft'), '2d')).toBe('ArrowLeft');
  });
  it('reads + and - by character, so a Danish keyboard zooms too', () => {
    expect(navKey(key('Minus', '+'), '2d')).toBe('char:+');
    expect(navKey(key('Equal', '='), '2d')).toBe('char:+');
    expect(navKey(key('Slash', '-'), '2d')).toBe('char:-');
  });
  it('ignores other keys, and Space in 2D (it does nothing there)', () => {
    expect(navKey(key('KeyX', 'x'), '2d')).toBeNull();
    expect(navKey(key('Enter', 'Enter'), '3d')).toBeNull();
    expect(navKey(key('Space', ' '), '2d')).toBeNull();
    expect(navKey(key('Space', ' '), '3d')).toBe('Space');
  });
});

describe('targetAxes', () => {
  it('pans in 2D (W up, D right) and zooms with Q/E', () => {
    expect(targetAxes(['KeyW', 'KeyD'], '2d', false)).toMatchObject({ x: 1, y: -1 });
    expect(targetAxes(['KeyE'], '2d', false).zoom).toBe(1);
    expect(targetAxes(['char:-'], '2d', false).zoom).toBe(-1);
  });
  it('flies in 3D: W forward, A left, E up, arrows orbit', () => {
    expect(targetAxes(['KeyW', 'KeyA', 'KeyE'], '3d', false)).toMatchObject({ z: 1, x: -1, y: 1 });
    expect(targetAxes(['ArrowRight', 'ArrowUp'], '3d', false)).toMatchObject({ yaw: 1, pitch: 1 });
  });
  it('cancels opposite keys and never doubles an axis', () => {
    expect(isStill(targetAxes(['KeyW', 'KeyS'], '2d', false))).toBe(true);
    expect(targetAxes(['KeyW', 'ArrowUp'], '2d', false).y).toBe(-1);
  });
  it('goes faster with Shift', () => {
    expect(targetAxes(['KeyD'], '2d', true).x).toBe(EXPLORER.keys.fast);
  });
});

describe('ease', () => {
  const go = { ...STILL, x: 1 };
  it('starts gently and closes in on the target', () => {
    const a = ease(STILL, go, 0.016, 0.12, false);
    expect(a.x).toBeGreaterThan(0);
    expect(a.x).toBeLessThan(0.2);
    let v = STILL;
    for (let i = 0; i < 120; i++) v = ease(v, go, 0.016, 0.12, false);
    expect(v.x).toBeCloseTo(1, 3);
  });
  it('is frame-rate independent: two half steps equal one whole step', () => {
    const one = ease(STILL, go, 0.032, 0.12, false);
    const two = ease(ease(STILL, go, 0.016, 0.12, false), go, 0.016, 0.12, false);
    expect(two.x).toBeCloseTo(one.x, 10);
  });
  it('jumps straight to the target under reduced motion', () => {
    expect(ease(STILL, go, 0.016, 0.12, true)).toEqual(go);
    expect(ease(go, STILL, 0.016, 0.12, true)).toEqual(STILL);
  });
});
