import { describe, expect, it } from 'vitest';
import type { TermFrontmatter } from '../src/schema';
import { checkClosedVocab } from './closed-vocab';

const both = (text: string) => ({ en: text, da: text });

/** A term whose Summary is `en` / `da` and whose Body facets are empty. */
const term = (name: string, summary: { en: string; da: string }) =>
  ({
    term: both(name),
    aka: { en: [], da: [] },
    summary,
    body: { formal: both(''), plain: both(''), inPractice: both(''), whyItMatters: both('') },
  }) as unknown as TermFrontmatter;

const unknownIn = (summary: { en: string; da: string }) => {
  const terms = new Map([
    ['x/zorblat', term('Zorblat', summary)],
    ['x/frimpel', term('Frimpel', both(''))],
    ['x/wuxy', term('Wuxy', both(''))],
  ]);
  const found = checkClosedVocab(terms).filter((r) => r.id === 'x/zorblat');
  return Object.fromEntries(found.map((r) => [r.lang, r.unknown]));
};

describe('checkClosedVocab', () => {
  it('allows inflections of term names, one suffix on another, and restored stems', () => {
    const en = 'zorblats zorblatingly zorblatted wuxiness unzorblatted zorblat-frimpel';
    expect(unknownIn({ en, da: '' })).toEqual({});
  });
  it('stops after two suffixes and flags words it cannot place', () => {
    expect(unknownIn({ en: 'zorblatinglys qwxyzzy', da: '' })).toEqual({
      en: ['qwxyzzy', 'zorblatinglys'],
    });
  });
  it('splits Danish compounds, with a linking -s-, but never English ones', () => {
    expect(unknownIn(both('zorblatsfrimpel zorblatfrimpel'))).toEqual({
      en: ['zorblatfrimpel', 'zorblatsfrimpel'],
    });
  });
});
