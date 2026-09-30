import { describe, expect, it } from 'vitest';
import type { GraphNode } from './graph-model';
import { readArrival } from './explorer-arrival';

const nodes = ['security/phishing', 'security/mfa', 'cs/api'].map((id) => ({ id }) as GraphNode);

describe('readArrival', () => {
  it('reads nothing from a bare address', () => {
    expect(readArrival(nodes, '')).toEqual({ route: null, focus: null, term: null });
  });
  it('reads a route only when both ends are known terms', () => {
    expect(readArrival(nodes, '?from=security/phishing&to=security/mfa').route).toEqual([
      'security/phishing',
      'security/mfa',
    ]);
    expect(readArrival(nodes, '?from=security/phishing&to=nope').route).toBeNull();
    expect(readArrival(nodes, '?from=security/phishing').route).toBeNull();
  });
  it('reads a known focus and deep-linked term', () => {
    expect(readArrival(nodes, '?focus=cs/api&term=security/mfa')).toEqual({
      route: null,
      focus: 'cs/api',
      term: 'security/mfa',
    });
  });
  it('ignores unknown ids', () => {
    expect(readArrival(nodes, '?focus=cs/nope&term=x')).toEqual({
      route: null,
      focus: null,
      term: null,
    });
  });
});
