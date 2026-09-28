import { describe, expect, it } from 'vitest';
import { domainBands, effectiveHome, effectivePaint, termVisible } from '../graph-layout';
import { clusterColour, domainColour } from '../graph-style';
import { on } from './test-fixtures';

describe('termVisible (A86)', () => {
  it('shows a term while at least one of its domains is enabled', () => {
    expect(termVisible({ domain: ['cs', 'security'] }, on('security'))).toBe(true);
    expect(termVisible({ domain: ['cs', 'security'] }, on('cs'))).toBe(true);
    expect(termVisible({ domain: ['cs'] }, on('security', 'ai'))).toBe(false);
    expect(termVisible({ domain: ['cs', 'security'] }, on())).toBe(false);
  });
});

describe('effectiveHome / effectivePaint', () => {
  const firewall = { domain: ['cs', 'security'], cluster: 'networking' };
  it('keeps the cluster domain while it is enabled', () => {
    expect(effectiveHome(firewall)).toBe('cs');
    expect(effectiveHome(firewall, on('cs', 'security'))).toBe('cs');
    expect(effectivePaint(firewall, on('cs', 'security'))).toEqual({
      fill: clusterColour('networking', 'cs'),
      ring: domainColour('security'),
    });
  });
  it('re-homes a shared term to an enabled domain, with no ring for a disabled one', () => {
    expect(effectiveHome(firewall, on('security'))).toBe('security');
    expect(effectivePaint(firewall, on('security'))).toEqual({
      fill: domainColour('security'),
      ring: null,
    });
    expect(effectivePaint({ domain: ['ai', 'security'], cluster: 'ai-risk' }, on('ai')).ring).toBe(
      null,
    );
  });
});

describe('domainBands (A86)', () => {
  const firewall = { domain: ['cs', 'security'], cluster: 'networking' };
  it('gives a shared term one band per enabled domain, home first', () => {
    expect(domainBands(firewall)).toEqual([domainColour('cs'), domainColour('security')]);
    expect(domainBands(firewall, on('security', 'cs'))).toEqual([
      domainColour('cs'),
      domainColour('security'),
    ]);
    expect(domainBands(firewall, on('security'))).toEqual([]);
    expect(domainBands({ domain: ['ai'], cluster: 'llm' })).toEqual([]);
  });
  it('re-homes the first band when the home domain is off', () => {
    const t = { domain: ['cs', 'security', 'ai'], cluster: 'networking' };
    expect(domainBands(t, on('security', 'ai'))).toEqual([
      domainColour('security'),
      domainColour('ai'),
    ]);
  });
});
