import { describe, expect, it } from 'vitest';
import {
  createMotionGate,
  cullBoxes,
  effectiveFocus,
  labelPov,
  relationLabel,
  rotatedSize,
} from './explorer-focus';

const at = (selected: string | null, hovered: string | null, moving = false, route = false) =>
  effectiveFocus({ selected, route, hovered, moving });

describe('effectiveFocus (A97a): selection wins over hover', () => {
  it('hover drives the look with nothing selected', () => {
    expect(at(null, 'mfa')).toEqual({ hood: 'mfa', preview: null });
    expect(at(null, null)).toEqual({ hood: null, preview: null });
  });
  it('a selection keeps its look; hover only previews another term', () => {
    expect(at('phishing', 'mfa')).toEqual({ hood: null, preview: 'mfa' });
    expect(at('phishing', 'phishing')).toEqual({ hood: null, preview: null });
    expect(at('phishing', null)).toEqual({ hood: null, preview: null });
  });
  it('a route holds the look like a selection', () => {
    expect(at(null, 'mfa', false, true)).toEqual({ hood: null, preview: 'mfa' });
  });
  it('ignores hover entirely while the map moves', () => {
    expect(at(null, 'mfa', true)).toEqual({ hood: null, preview: null });
    expect(at('phishing', 'mfa', true)).toEqual({ hood: null, preview: null });
  });
});

describe('createMotionGate (A97a)', () => {
  it('is open at rest', () => {
    expect(createMotionGate().open).toBe(true);
  });
  it('closes while moving and stays closed until the pointer moves after it stops', () => {
    const g = createMotionGate();
    expect(g.motion(true)).toBe(true);
    expect(g.motion(true)).toBe(false);
    expect(g.open).toBe(false);
    g.pointer(); // moved during motion: does not count
    g.motion(false);
    expect(g.open).toBe(false);
    g.pointer();
    expect(g.open).toBe(true);
  });
  it('stays open through still frames', () => {
    const g = createMotionGate();
    expect(g.motion(false)).toBe(false);
    expect(g.open).toBe(true);
  });
});

describe('relationLabel (A97a)', () => {
  const labels = { requires: 'Requires', unlocks: 'Unlocks', 'used-with': 'Used with' };
  const inverse = { requires: 'unlocks', 'used-with': 'used-with' };
  const l = { source: 'tls', target: 'pki', type: 'requires' };
  it("reads the link in the arrow's direction from the term's side", () => {
    expect(relationLabel(l, 'tls', labels, inverse)).toBe('requires');
    expect(relationLabel(l, 'pki', labels, inverse)).toBe('unlocks');
  });
  it('keeps symmetric types and falls back to the type', () => {
    expect(relationLabel({ ...l, type: 'used-with' }, 'pki', labels, inverse)).toBe('used with');
    expect(relationLabel({ ...l, type: 'mandates' }, 'tls', labels, inverse)).toBe('mandates');
  });
});

describe('label placement (A97a)', () => {
  it('keeps the first of two overlapping boxes, and boxes clear of it', () => {
    const kept = cullBoxes([
      { id: 'a', x: 0, y: 0, w: 40, h: 10 },
      { id: 'b', x: 20, y: 4, w: 40, h: 10 },
      { id: 'c', x: 0, y: 30, w: 40, h: 10 },
    ]);
    expect([...kept].sort()).toEqual(['a', 'c']);
  });
  it('sizes a rotated box', () => {
    expect(rotatedSize(40, 10, 0)).toEqual({ w: 40, h: 10 });
    const r = rotatedSize(40, 10, Math.PI / 2);
    expect(r.w).toBeCloseTo(10);
    expect(r.h).toBeCloseTo(40);
  });
  it("labels the selection's links, a small hover neighbourhood's, else none", () => {
    expect(labelPov(at('phishing', 'mfa'), 'phishing', 99, 12)).toBe('phishing');
    expect(labelPov(at(null, 'mfa'), null, 12, 12)).toBe('mfa');
    expect(labelPov(at(null, 'mfa'), null, 13, 12)).toBeNull();
    expect(labelPov(at(null, 'mfa', false, true), null, 3, 12)).toBeNull();
  });
});
