import { describe, expect, it } from 'vitest';
import { LabelSlots, labelCandidates } from './labels';
import { matchTier, searchScore } from './search';

describe('labelCandidates', () => {
  const e = {
    n: 4,
    visible: new Uint8Array([1, 1, 1, 0]),
    rank: new Float32Array([0.5, 0.1, 0.9, 1]),
  };
  it('without a selection: hubs and the hover, best rank first', () => {
    expect(labelCandidates(e, new Uint8Array(4), -1, 1)).toEqual([1, 2, 0]);
  });
  it('with a selection: it, the hover, then lit neighbours (hidden terms never)', () => {
    const lit = new Uint8Array([1, 0, 1, 1]);
    expect(labelCandidates(e, lit, 0, 1)).toEqual([0, 1, 2]);
  });
});

describe('LabelSlots', () => {
  it('places below, then above, then gives up (unless big)', () => {
    const slots = new LabelSlots(400, 400);
    expect(slots.place(100, 100, 10, 40, 11, false)).toBe(114);
    expect(slots.place(100, 100, 10, 40, 11, false)).toBe(75);
    expect(slots.place(100, 100, 10, 40, 11, false)).toBeUndefined();
    expect(slots.place(100, 100, 10, 40, 11, true)).toBe(75);
  });
  it('keeps labels inside the view', () => {
    expect(new LabelSlots(100, 100).place(2, 50, 5, 40, 11, false)).toBeUndefined();
  });
});

describe('search scoring', () => {
  it('tiers exact, prefix, inside and no match', () => {
    expect([
      matchTier('API', 'api'),
      matchTier('API key', 'api'),
      matchTier('REST API', 'api'),
    ]).toEqual([0, 1, 2]);
    expect(matchTier('DNS', 'api')).toBe(-1);
  });
  it('ranks an alias just below a name, and an id-only match last', () => {
    const n = { id: 'x/mfa', term: { en: 'Multi-factor' }, aka: { en: ['MFA'] } };
    expect(searchScore(n, 'mfa', 'en')).toBe(1);
    expect(searchScore(n, 'multi', 'en')).toBe(2);
    expect(searchScore(n, 'x/', 'en')).toBe(6);
    expect(searchScore(n, 'zz', 'en')).toBeUndefined();
  });
});
