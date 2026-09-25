import { describe, expect, it } from 'vitest';
import {
  RECENT_MAX,
  isCurrentNav,
  isSearchShortcut,
  isTypingTarget,
  parseRecent,
  prefersDanish,
  pushRecent,
} from './prefs';

describe('recently viewed', () => {
  it('parses only a list of strings', () => {
    expect(parseRecent(null)).toEqual([]);
    expect(parseRecent('not json')).toEqual([]);
    expect(parseRecent('{"a":1}')).toEqual([]);
    expect(parseRecent('["a", 2, "b"]')).toEqual(['a', 'b']);
  });
  it('puts the latest first, without duplicates, capped', () => {
    expect(pushRecent([], 'a')).toEqual(['a']);
    expect(pushRecent(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
    const many = Array.from({ length: RECENT_MAX }, (_, i) => `t${i}`);
    const next = pushRecent(many, 'new');
    expect(next).toHaveLength(RECENT_MAX);
    expect(next[0]).toBe('new');
    expect(next).not.toContain(`t${RECENT_MAX - 1}`);
    expect(pushRecent(['a', 'b'], 'c', 2)).toEqual(['c', 'a']);
  });
});

describe('isCurrentNav', () => {
  const home = '/tech-atlas/en/';
  it('marks home only on the home page, with or without the slash or index.html', () => {
    for (const p of ['/tech-atlas/en/', '/tech-atlas/en', '/tech-atlas/en/index.html'])
      expect(isCurrentNav(p, home, home)).toBe(true);
    expect(isCurrentNav('/tech-atlas/en/study/', home, home)).toBe(false);
  });
  it('marks a section on itself and the pages below it', () => {
    const cmp = '/tech-atlas/en/compare/';
    expect(isCurrentNav('/tech-atlas/en/compare', cmp, home)).toBe(true);
    expect(isCurrentNav('/tech-atlas/en/compare/risk-vs-threat/', cmp, home)).toBe(true);
    expect(isCurrentNav('/tech-atlas/en/', cmp, home)).toBe(false);
    expect(isCurrentNav('/tech-atlas/en/comparex/', cmp, home)).toBe(false);
  });
});

describe('prefersDanish', () => {
  it('is true when Danish outranks English', () => {
    expect(prefersDanish(['da'])).toBe(true);
    expect(prefersDanish(['da-DK', 'en-US'])).toBe(true);
    expect(prefersDanish(['de-DE', 'DA', 'en'])).toBe(true);
  });
  it('is false when English comes first or Danish is absent', () => {
    expect(prefersDanish(['en-GB', 'da'])).toBe(false);
    expect(prefersDanish(['sv', 'nb'])).toBe(false);
    expect(prefersDanish([])).toBe(false);
    // "dan"/"dak" are not Danish; only the "da" subtag counts.
    expect(prefersDanish(['dak'])).toBe(false);
  });
});

describe('search shortcut', () => {
  it('ignores keys typed into fields', () => {
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget({ tagName: 'BODY' })).toBe(false);
    expect(isTypingTarget({ tagName: 'A' })).toBe(false);
    expect(isTypingTarget({ tagName: 'input' })).toBe(true);
    expect(isTypingTarget({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isTypingTarget({ tagName: 'SELECT' })).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
  });
  it('is a plain "/" only', () => {
    expect(isSearchShortcut({ key: '/' })).toBe(true);
    expect(isSearchShortcut({ key: '/', ctrlKey: true })).toBe(false);
    expect(isSearchShortcut({ key: '/', metaKey: true })).toBe(false);
    expect(isSearchShortcut({ key: '/', altKey: true })).toBe(false);
    expect(isSearchShortcut({ key: '?' })).toBe(false);
  });
});
