import { describe, expect, it } from 'vitest';
import { makeLinker, namesOf, type LinkableTerm } from './autolink';

const terms: LinkableTerm[] = [
  { id: 'security/phishing', term: { en: 'Phishing', da: 'Phishing' } },
  { id: 'security/spear-phishing', term: { en: 'Spear phishing', da: 'Spear phishing' } },
  {
    id: 'security/ids',
    term: { en: 'Intrusion detection system (IDS)', da: 'Indtrængningsdetektion (IDS)' },
  },
  { id: 'cs/password', term: { en: 'Password', da: 'Adgangskode' }, aka: { en: [], da: [] } },
  { id: 'cs/os', term: { en: 'OS', da: 'OS' } },
];
const ids = (segs: { id?: string }[]) => segs.filter((s) => s.id).map((s) => s.id);

describe('namesOf', () => {
  it('splits a parenthetical abbreviation into its own name', () => {
    expect(namesOf('Intrusion detection system (IDS)')).toEqual([
      'Intrusion detection system',
      'IDS',
    ]);
    expect(namesOf('Denial of service (DoS/DDoS)')).toEqual(['Denial of service', 'DoS', 'DDoS']);
  });
});

describe('makeLinker', () => {
  const en = makeLinker(terms, 'en');
  const da = makeLinker(terms, 'da');

  it('prefers the longest name', () => {
    expect(ids(en.link('A spear phishing email arrived.'))).toEqual(['security/spear-phishing']);
  });

  it('matches case-insensitively at word boundaries, with plurals', () => {
    expect(ids(en.link('Two passwords and an IDS.'))).toEqual(['cs/password', 'security/ids']);
    expect(ids(en.link('Phishingly unrelated'))).toEqual([]);
  });

  it('recognises Danish inflections and English loanwords', () => {
    expect(ids(da.link('Adgangskoden blev opsnappet via phishing.'))).toEqual([
      'cs/password',
      'security/phishing',
    ]);
  });

  it('links a term only at its first mention, and never itself', () => {
    const seen = new Set<string>();
    const first = en.link('Phishing, then more phishing.', { seen });
    expect(ids(first)).toEqual(['security/phishing']);
    expect(ids(en.link('Phishing again.', { seen }))).toEqual([]);
    expect(ids(en.link('Phishing.', { self: 'security/phishing' }))).toEqual([]);
  });

  it('keeps the original text intact', () => {
    const text = 'Spear phishing beats a weak password.';
    expect(
      en
        .link(text)
        .map((s) => s.text)
        .join(''),
    ).toBe(text);
  });

  it('ignores names shorter than three characters', () => {
    expect(ids(en.link('The OS boots.'))).toEqual([]);
  });

  it('collects mentions across texts', () => {
    expect(en.mentions(['phishing', 'a password'], 'security/phishing')).toEqual(['cs/password']);
  });

  it('resolves a shared name to the page domain, else leaves it unlinked', () => {
    const both: LinkableTerm[] = [
      { id: 'security/audit', term: { en: 'Audit', da: 'Audit' } },
      { id: 'cs/audit', term: { en: 'Audit', da: 'Audit' } },
      { id: 'cs/log', term: { en: 'Log', da: 'Log' } },
    ];
    const l = makeLinker(both, 'en');
    expect(ids(l.link('the audit trail', { self: 'cs/log' }))).toEqual(['cs/audit']);
    expect(ids(l.link('the audit trail'))).toEqual([]);
  });

  it('skips everyday words that spell a term name', () => {
    const t: LinkableTerm[] = [
      { id: 'cs/account', term: { en: 'Account', da: 'Konto' } },
      {
        id: 'cs/cryptographic-key',
        term: { en: 'Cryptographic key', da: 'Nøgle' },
        aka: { en: ['key'], da: [] },
      },
    ];
    expect(ids(makeLinker(t, 'da').link('på et kontor med en konto'))).toEqual(['cs/account']);
    expect(ids(makeLinker(t, 'en').link('a house key, not a cryptographic key'))).toEqual([
      'cs/cryptographic-key',
    ]);
  });
});
