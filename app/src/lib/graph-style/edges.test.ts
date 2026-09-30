import { describe, expect, it } from 'vitest';
import { EDGE_TYPES, type EdgeType } from '../../schema';
import {
  FAMILY_COLOURS,
  curveOffsets,
  domainColour,
  edgePaint,
  flowOffset,
  isCrossDomain,
  isDirected,
} from '../graph-style';
import { FAMILY } from '../graph-model';
import { pairKey } from './edges';

describe('edges', () => {
  it('matches the schema: symmetric types have no direction', () => {
    for (const [type, meta] of Object.entries(EDGE_TYPES))
      expect(isDirected(type as EdgeType)).toBe(!meta.symmetric);
  });
  it('colours every relationship family', () => {
    for (const f of Object.values(FAMILY)) expect(FAMILY_COLOURS[f]).toMatch(/^#[0-9a-f]{6}$/);
  });
  it('detects edges that bridge domains', () => {
    expect(isCrossDomain(['security'], ['cs'])).toBe(true);
    expect(isCrossDomain(['security', 'cs'], ['cs'])).toBe(false);
  });
  it('paints a cross-domain edge with a domain → family → domain gradient', () => {
    const a = { domain: ['security'], cluster: 'controls' };
    const b = { domain: ['cs'], cluster: 'cryptography' };
    const p = edgePaint({ type: 'requires', family: 'dependency' }, a, b);
    expect(p).toEqual({
      colour: FAMILY_COLOURS.dependency,
      directed: true,
      crossDomain: true,
      gradient: [domainColour('security'), FAMILY_COLOURS.dependency, domainColour('cs')],
    });
    const same = edgePaint({ type: 'used-with', family: 'association' }, a, a);
    expect(same.directed).toBe(false);
    expect(same.gradient).toBeNull();
  });
});

describe('pairKey', () => {
  it('keys an unordered pair the same whichever way round, and distinct pairs apart', () => {
    expect(pairKey('a', 'b')).toBe(pairKey('b', 'a'));
    expect(pairKey('a', 'bc')).not.toBe(pairKey('ab', 'c'));
  });
});

describe('curveOffsets', () => {
  it('bends a lone edge a little', () => {
    expect(curveOffsets([{ source: 'a', target: 'b' }])).toEqual([16]);
  });
  it('fans parallel edges out on alternating sides, whichever way they point', () => {
    const [ab, ba, ab2] = curveOffsets([
      { source: 'a', target: 'b' },
      { source: 'b', target: 'a' },
      { source: 'a', target: 'b' },
    ]);
    // In the pair's canonical a→b frame: +16, −16, +34 — three distinct lanes.
    expect([ab, -ba, ab2]).toEqual([16, -16, 34]);
  });
});

describe('flowOffset', () => {
  it('moves the dash pattern backwards over time and wraps each period', () => {
    expect(flowOffset(0)).toBeCloseTo(0);
    expect(flowOffset(500)).toBeLessThan(0);
    expect(flowOffset(500)).toBeGreaterThan(-12);
  });
});
