import { describe, expect, it } from 'vitest';
import { dotShadow, inkOf, inkVars, stripe } from './ink';

describe('dotShadow', () => {
  it('is empty for a plain dot', () => {
    expect(dotShadow(false, false)).toBe('');
  });
  it('rings a term in a second domain and glows a hub', () => {
    expect(dotShadow(true, false)).toBe('0 0 0 1.5px var(--chart-bg), 0 0 0 3.5px var(--ink2)');
    expect(dotShadow(false, true)).toBe('0 0 10px var(--ink)');
  });
  it('lists the ring before the glow when both apply', () => {
    expect(dotShadow(true, true)).toBe(
      '0 0 0 1.5px var(--chart-bg), 0 0 0 3.5px var(--ink2), 0 0 10px var(--ink)',
    );
  });
});

describe('inkVars', () => {
  it('sets the night and cream colours, and the second ink when given', () => {
    const a = { d: '#111', l: '#eee' };
    expect(inkVars(a)).toBe('--ink-d:#111;--ink-l:#eee;');
    expect(inkVars(a, { d: '#222', l: '#ddd' })).toBe(
      '--ink-d:#111;--ink-l:#eee;--ink2-d:#222;--ink2-l:#ddd;',
    );
  });
});

describe('inkOf / stripe', () => {
  it('falls back to grey for an unknown domain and to night for a missing cream', () => {
    const ink = inkOf({ web: '#0af' }, {});
    expect(ink('web')).toEqual({ d: '#0af', l: '#0af' });
    expect(ink('nope')).toEqual({ d: '#a3a3a3', l: '#57534e' });
  });
  it('shades every other decade', () => {
    expect(stripe(0)).toBe('transparent');
    expect(stripe(1)).not.toBe('transparent');
  });
});
