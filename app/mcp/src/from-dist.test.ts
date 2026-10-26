import { describe, expect, it } from 'vitest';
import { toBundle } from './from-dist';

const term = {
  id: 'security/encryption',
  url: {
    en: 'https://atlas.maintz.dev/en/terms/security/encryption/',
    da: 'https://atlas.maintz.dev/da/terms/security/encryption/',
  },
  term: { en: 'Encryption', da: 'Kryptering' },
  aka: { en: [], da: ['kryptografering'] },
  domain: ['security'],
  cluster: 'crypto',
  summary: { en: 'Hiding data.', da: 'At skjule data.' },
  body: { plain: { en: 'A lock.', da: 'En lås.' } },
  deepDive: { en: 'Long text.', da: 'Lang tekst.' },
  sources: [{ title: 'NIST', tier: 'standard' }],
  edges: [],
  depth: 1,
  draft: true,
};

const link = {
  source: 'cs/tls',
  target: 'security/encryption',
  type: 'requires',
  family: 'dependency',
  weight: 5,
};

const dist = (over: Record<string, unknown> = {}) => ({
  terms: { licence: {}, count: 1, terms: [term] },
  graph: { nodes: [], links: [link] },
  search: [],
  questionsEn: [],
  questionsDa: [],
  ...over,
});

describe('toBundle', () => {
  it('keeps the fields the tools read, in both languages, and drops the rest', () => {
    const bundle = toBundle(dist());
    expect(bundle.terms[0]).toMatchObject({
      aka: { da: ['kryptografering'] },
      body: { plain: { da: 'En lås.' } },
    });
    expect(bundle.terms[0]).not.toHaveProperty('deepDive');
    expect(bundle.links).toEqual([
      { source: 'cs/tls', target: 'security/encryption', type: 'requires' },
    ]);
  });

  it('fails the build when the site stops publishing a Danish name', () => {
    const broken = { ...term, term: { en: 'Encryption' } };
    expect(() => toBundle(dist({ terms: { terms: [broken] } }))).toThrow();
  });
});
