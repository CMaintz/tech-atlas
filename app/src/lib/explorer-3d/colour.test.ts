import { describe, expect, it } from 'vitest';
import { atStrength, rgba } from './colour';

describe('atStrength', () => {
  const red = { r: 1, g: 0.5, b: 0 };
  it('scales a colour down on the night map: black is invisible', () => {
    expect(atStrength(red, 0.5, false)).toEqual([0.5, 0.25, 0]);
    expect(atStrength(red, 0, false)).toEqual([0, 0, 0]);
  });
  it('mixes a colour from white on the cream map: white is invisible', () => {
    expect(atStrength(red, 0.5, true)).toEqual([1, 0.75, 0.5]);
    expect(atStrength(red, 0, true)).toEqual([1, 1, 1]);
    expect(atStrength(red, 1, true)).toEqual([1, 0.5, 0]);
  });
});

describe('rgba', () => {
  it('writes a hex colour as CSS rgba', () => {
    expect(rgba('#ff8000', 0.9)).toBe('rgba(255,128,0,0.9)');
  });
});
