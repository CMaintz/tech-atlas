import { describe, expect, it } from 'vitest';
import { matchTier, searchScore, searchTerms } from './term-search';

const node = (id: string) => ({ id, term: { en: id, da: id } });

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

describe('searchTerms', () => {
  it('ranks exact and prefix matches first', () => {
    const ns = [node('x/api-key'), node('x/api')];
    ns[0].term.en = 'API key';
    ns[1].term.en = 'API';
    expect(searchTerms(ns, 'api', 'en').map((n) => n.id)).toEqual(['x/api', 'x/api-key']);
    expect(searchTerms(ns, '  ', 'en')).toEqual([]);
  });
  it('matches aliases in the reader’s language, just below a name at the same tier', () => {
    const ns = [
      { ...node('x/mfa'), aka: { en: ['MFA', '2FA'], da: ['MFA'] } },
      { ...node('x/mfa-fatigue') },
    ];
    ns[0].term.en = 'Multi-factor authentication';
    ns[1].term.en = 'MFA fatigue';
    expect(searchTerms(ns, 'mfa', 'en').map((n) => n.id)).toEqual(['x/mfa', 'x/mfa-fatigue']);
    expect(searchTerms(ns, '2fa', 'en').map((n) => n.id)).toEqual(['x/mfa']);
    expect(searchTerms(ns, '2fa', 'da')).toEqual([]);
  });
});
