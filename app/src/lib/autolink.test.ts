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
    // DA "samle/samlet" (gather/total) must not become SAML + a Danish suffix.
    const saml: LinkableTerm[] = [{ id: 'cs/saml', term: { en: 'SAML', da: 'SAML' } }];
    expect(ids(makeLinker(saml, 'da').link('de samlede tal, samlet set; SAML bruges'))).toEqual([
      'cs/saml',
    ]);
    expect(ids(makeLinker(saml, 'da').link('vi samler data og samle dem'))).toEqual([]);
    expect(ids(makeLinker(t, 'en').link('a house key, not a cryptographic key'))).toEqual([
      'cs/cryptographic-key',
    ]);
  });

  it('links ambiguous AI names only on pages in their own domain', () => {
    const t: LinkableTerm[] = [
      { id: 'ai/token', term: { en: 'Token', da: 'Token' } },
      {
        id: 'ai/recall',
        term: { en: 'Recall', da: 'Genkaldelse (recall)' },
        aka: { en: ['sensitivity', 'true positive rate'], da: [] },
      },
      {
        id: 'ai/attention-mechanism',
        term: { en: 'Attention mechanism', da: 'Attention-mekanisme' },
        aka: { en: ['attention'], da: [] },
      },
    ];
    const en = makeLinker(t, 'en');
    const da = makeLinker(t, 'da');
    // Real false links from security/cs/platform prose: an OAuth token, a car recall,
    // human attention, data sensitivity.
    expect(ids(en.link('the app gets a token', { self: 'cs/oauth' }))).toEqual([]);
    expect(
      ids(da.link('shoppen modtager et signeret token', { self: 'cs/openid-connect' })),
    ).toEqual([]);
    expect(ids(en.link('Like a car recall', { self: 'security/patch-management' }))).toEqual([]);
    expect(ids(en.link('limits of attention', { self: 'security/human-factor' }))).toEqual([]);
    expect(ids(en.link('sorted by sensitivity', { self: 'security/security-policy' }))).toEqual([]);
    // Same domain: still a link.
    expect(ids(en.link('predict the next token', { self: 'ai/embedding' }))).toEqual(['ai/token']);
    expect(ids(en.link('precision and recall', { self: 'ai/f1-score' }))).toEqual(['ai/recall']);
    expect(ids(da.link('tokens i konteksten', { self: 'ai/context-window' }))).toEqual([
      'ai/token',
    ]);
    // Fuller names link anywhere.
    expect(ids(en.link('the attention mechanism', { self: 'cs/kernel' }))).toEqual([
      'ai/attention-mechanism',
    ]);
    expect(ids(en.link('its true positive rate', { self: 'security/ids' }))).toEqual(['ai/recall']);
  });
});
