import { describe, expect, it } from 'vitest';
import { contrastPairs, relationsOf, type TermEntry } from './terms';

/** Only the fields relationsOf and contrastPairs read. */
const entry = (id: string, edges: Record<string, unknown> = {}) =>
  ({ id, data: { edges } }) as unknown as TermEntry;

const why = { en: 'Because', da: 'Fordi' };
const phishing = entry('security/phishing', { 'kind-of': ['social-engineering'] });
const social = entry('security/social-engineering', { 'contrasts-with': ['phishing'] });
const awareness = entry('security/awareness', {
  mitigates: [{ to: 'security/phishing', why, strength: 'strong' }],
});
const all = [phishing, social, awareness];

const summary = (term: TermEntry) =>
  relationsOf(term, all).map((r) => [r.type, r.target.id, r.generated, r.why, r.strength]);

describe('relationsOf', () => {
  it('lists authored edges first, then every inverse turned round to read from the term', () => {
    expect(summary(phishing)).toEqual([
      ['kind-of', 'security/social-engineering', false, undefined, undefined],
      ['contrasts-with', 'security/social-engineering', true, undefined, undefined],
      ['mitigated-by', 'security/awareness', true, why, 'strong'],
    ]);
  });

  it('carries the reason and strength of an object edge', () => {
    expect(summary(awareness)).toEqual([['mitigates', 'security/phishing', false, why, 'strong']]);
  });
});

describe('contrastPairs', () => {
  it('keeps each authored pair once', () => {
    const twice = [
      entry('a/x', { 'contrasts-with': ['y'] }),
      entry('a/y', { 'contrasts-with': ['x'] }),
    ];
    expect(contrastPairs(twice).map((p) => [p.a.id, p.b.id])).toEqual([['a/x', 'a/y']]);
  });
});
