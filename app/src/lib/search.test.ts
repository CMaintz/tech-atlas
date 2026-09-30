import { describe, expect, it } from 'vitest';
import { collisionsOf } from './collisions';
import { parseIntent, type Intent } from './intent';
import {
  bestMatch,
  buildEngine,
  disambiguationLink,
  intentLink,
  rankLexical,
  type SearchDoc,
  type SearchIndex,
} from './search';

const doc = (id: string, en: string, over: Partial<SearchDoc> = {}): SearchDoc => ({
  id,
  term: { en, da: `${en} (da)` },
  aka: { en: [], da: [] },
  summary: { en: `About ${en}.`, da: `Om ${en}.` },
  contrasts: [],
  ...over,
});

const docs = [
  doc('security/threat', 'Threat', { contrasts: ['security/risk'] }),
  doc('security/threat-hunting', 'Threat hunting'),
  doc('security/risk', 'Risk', { contrasts: ['security/threat'] }),
  doc('security/mfa', 'Multi-factor authentication', { aka: { en: ['MFA'], da: [] } }),
  doc('security/audit', 'Audit'),
  doc('cs/audit', 'Audit'),
];
const engine = buildEngine(docs, 'en');
const index: SearchIndex = {
  docs,
  byId: new Map(docs.map((d) => [d.id, d])),
  engine,
  collisions: collisionsOf(docs.map((d) => d.id)),
};
const opts = {
  lang: 'en' as const,
  langBase: '/en/',
  labels: { compare: '{a} vs {b}', route: '{a} → {b}', before: 'before {a}' },
};
const link = (query: string) =>
  intentLink(parseIntent(query) as Intent, (p) => bestMatch(index, p), opts);

describe('bestMatch', () => {
  it('prefers an exact name over a higher-ranked prefix hit', () => {
    expect(bestMatch(index, 'threat')?.id).toBe('security/threat');
  });
  it('finds a term by alias, and by a near miss', () => {
    expect(bestMatch(index, 'mfa')?.id).toBe('security/mfa');
    expect(bestMatch(index, 'authentcation')?.id).toBe('security/mfa');
    expect(bestMatch(index, 'zebra')).toBeUndefined();
  });
});

describe('rankLexical', () => {
  it('ranks a name query as it is', () => {
    const r = rankLexical(engine, 'threat', false);
    expect(r.natural).toBe(false);
    expect(r.lexicalIds.slice(0, 2).sort()).toEqual(['security/threat', 'security/threat-hunting']);
    expect(r.nameIds).toEqual([]);
  });
  it('treats a question as natural language, with names only for fusion', () => {
    const r = rankLexical(engine, 'what is the risk of it', false);
    expect(r.natural).toBe(true);
    expect(r.nameIds).toContain('security/risk');
  });
  it('never treats an intent as natural language, and ranks nothing without an index', () => {
    expect(rankLexical(engine, 'what is the risk of it', true).natural).toBe(false);
    expect(rankLexical(null, 'risk', false)).toEqual({
      natural: false,
      lexicalIds: [],
      nameIds: [],
    });
  });
});

describe('intentLink', () => {
  it('compares a contrasted pair on its compare page', () => {
    expect(link('threat vs risk')).toEqual({
      href: '/en/compare/risk-vs-threat/',
      label: 'Threat vs Risk',
    });
  });
  it('routes any other pair through the explorer', () => {
    expect(link('from mfa to risk')).toEqual({
      href: '/en/explorer/?from=security%2Fmfa&to=security%2Frisk',
      label: 'Multi-factor authentication → Risk',
    });
  });
  it('sends "before X" to its prerequisites', () => {
    expect(link('before mfa')).toEqual({
      href: '/en/terms/security/mfa/#learn-first',
      label: 'before Multi-factor authentication',
    });
  });
  it('leads nowhere for one term twice', () => {
    expect(link('risk vs risk')).toBeNull();
  });
});

describe('disambiguationLink', () => {
  it('sends a shared name to its Disambiguation page', () => {
    expect(disambiguationLink('Audit', index.collisions, '/en/', '{name}: {n} terms')).toEqual({
      href: '/en/terms/audit/',
      label: 'audit: 2 terms',
    });
  });
  it('is null for any other query', () => {
    expect(disambiguationLink('risk', index.collisions, '/en/', '{name}')).toBeNull();
  });
});
