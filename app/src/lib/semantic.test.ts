import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  compareVectors,
  cosine,
  dequantize,
  dropStopwords,
  fromBase64,
  loadIndex,
  looksNaturalLanguage,
  nearBest,
  passageText,
  quantize,
  rankBySimilarity,
  reciprocalRankFusion,
  toBase64,
  type VectorFile,
} from './semantic';

describe('cosine', () => {
  it('is 1 for parallel, 0 for orthogonal, -1 for opposite vectors', () => {
    expect(cosine([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 5])).toBeCloseTo(0);
    expect(cosine([1, 1], [-1, -1])).toBeCloseTo(-1);
  });
  it('is 0 (not NaN) for a zero vector', () => {
    expect(cosine([0, 0], [1, 1])).toBe(0);
  });
});

describe('Int8 quantisation', () => {
  it('round-trips through base64 and keeps direction', () => {
    const vs = [
      [0.1, -0.2, 0.05, 0.3],
      [-0.4, 0.01, 0.2, -0.1],
    ];
    const q = quantize(vs);
    expect(Math.max(...[...q.subarray(0, 4)].map(Math.abs))).toBe(127);
    const back = dequantize(fromBase64(toBase64(q)), 4);
    expect(back).toHaveLength(2);
    back.forEach((v, i) => {
      expect(cosine(v, vs[i])).toBeGreaterThan(0.999);
      expect(cosine(v, v)).toBeCloseTo(1);
    });
  });
});

describe('reciprocalRankFusion', () => {
  it('rewards items ranked well by both lists and records their sources', () => {
    const fused = reciprocalRankFusion({ lexical: ['a', 'b', 'c'], semantic: ['c', 'd', 'a'] });
    expect(fused.map((f) => f.id)).toEqual(['a', 'c', 'b', 'd']);
    expect(fused[0].from).toEqual(['lexical', 'semantic']);
    expect(fused.find((f) => f.id === 'd')!.from).toEqual(['semantic']);
  });
  it('uses 1/(k + rank) with 1-based ranks', () => {
    const [top] = reciprocalRankFusion({ x: ['a'] }, 60);
    expect(top.score).toBeCloseTo(1 / 61);
  });
  it('returns nothing for empty rankings', () => {
    expect(reciprocalRankFusion({ lexical: [], semantic: [] })).toEqual([]);
  });
});

describe('looksNaturalLanguage', () => {
  it('treats three or more words as a question', () => {
    expect(looksNaturalLanguage('how do hackers get in', 5)).toBe(true);
    expect(looksNaturalLanguage('zero trust', 3)).toBe(false);
  });
  it('treats an unmatched short query as a description', () => {
    expect(looksNaturalLanguage('lækket kodeord', 0)).toBe(true);
    expect(looksNaturalLanguage('xyz', 0)).toBe(false);
    expect(looksNaturalLanguage('   ', 0)).toBe(false);
  });
});

describe('nearBest', () => {
  it('keeps hits within the margin of the top score', () => {
    const s = [
      { id: 'a', score: 0.87 },
      { id: 'b', score: 0.85 },
      { id: 'c', score: 0.82 },
    ];
    expect(nearBest(s, 0.04).map((x) => x.id)).toEqual(['a', 'b']);
    expect(nearBest([])).toEqual([]);
  });
});

describe('dropStopwords', () => {
  it('drops English and Danish function words and lower-cases the rest', () => {
    expect(dropStopwords('How')).toBeNull();
    expect(dropStopwords('hvordan')).toBeNull();
    expect(dropStopwords('Passwords')).toBe('passwords');
    expect(dropStopwords('adgangskoder')).toBe('adgangskoder');
  });
});

describe('compareVectors', () => {
  const expected = { settingsHash: 's1', passageHashes: { a: 'h1', b: 'h2' } };
  it('accepts vectors that match', () => {
    expect(compareVectors(expected, expected)).toEqual({ errors: [], changed: [] });
  });
  it('only warns about a term whose text changed', () => {
    const file = { settingsHash: 's1', passageHashes: { a: 'old', b: 'h2' } };
    expect(compareVectors(file, expected)).toEqual({ errors: [], changed: ['a'] });
  });
  it('errors on added or removed terms', () => {
    const file = { settingsHash: 's1', passageHashes: { a: 'h1', gone: 'x' } };
    expect(compareVectors(file, expected).errors).toEqual([
      'terms without vectors: b',
      'vectors for removed terms: gone',
    ]);
  });
  it('errors when the model settings changed', () => {
    const file = { settingsHash: 's0', passageHashes: expected.passageHashes };
    expect(compareVectors(file, expected).errors).toHaveLength(1);
  });
});

describe('passageText', () => {
  it('embeds the name, aliases, summary and plain facet with the e5 passage prefix', () => {
    const t = {
      term: { en: 'MFA', da: 'MFA' },
      aka: { en: ['multi-factor authentication'], da: [] },
      summary: { en: 'More than one proof.', da: 'Mere end ét bevis.' },
      body: { plain: { en: 'A key and a code.', da: 'En nøgle og en kode.' } },
    };
    expect(passageText(t, 'en')).toBe(
      'passage: MFA (multi-factor authentication). More than one proof. A key and a code.',
    );
    expect(passageText(t, 'da')).toBe('passage: MFA. Mere end ét bevis. En nøgle og en kode.');
  });
});

// Real rankings, offline: the committed term vectors against query vectors that
// `npm run embed` produced with the same model (scripts/semantic-inputs.ts).
describe('semantic ranking (committed vectors)', () => {
  const file = JSON.parse(readFileSync('public/semantic/vectors.json', 'utf8')) as VectorFile;
  const fixture = JSON.parse(readFileSync('src/lib/semantic.fixture.json', 'utf8')) as {
    queries: string[];
    dim: number;
    data: string;
  };
  const index = loadIndex(file);
  const queries = dequantize(fromBase64(fixture.data), fixture.dim);
  const top = (q: string, k = 3) =>
    rankBySimilarity(index, queries[fixture.queries.indexOf(q)], k).map((s) => s.id);

  const expectations: [string, string][] = [
    ['how do I stop people reusing leaked passwords', 'security/credential-stuffing'],
    ['a program that locks your files and demands money', 'security/ransomware'],
    ['proving who you are when you log in', 'cs/authentication'],
    ['model learns the training examples too well and fails on new data', 'ai/overfitting'],
    ['a list of all the software components in a product', 'platform/sbom'],
    ['tricking someone on the phone into giving information', 'security/vishing'],
    ['giving users only the access they need', 'cs/least-privilege'],
    ['logging in with your fingerprint instead of a password', 'cs/passkey'],
    ['a flaw attackers use before the vendor knows about it', 'security/zero-day'],
    ['sneaking database commands into a login form', 'security/sql-injection'],
    ['nogen sidder skjult mellem to parter og læser med', 'security/man-in-the-middle'],
    // Danish queries, including ones whose answer is an English-named term.
    [
      'hvordan forhindrer jeg at folk genbruger lækkede adgangskoder',
      'security/credential-stuffing',
    ],
    ['når sprogmodellen finder på ting der ikke er sande', 'ai/hallucination'],
    ['falske mails der lokker folk til at give deres kodeord', 'security/phishing'],
    ['kopier af data så vi kan gendanne efter et nedbrud', 'security/backup'],
    ['hvem har ansvaret for persondata', 'security/data-controller'],
  ];

  it('has a fixture vector for every expectation', () => {
    expect([...fixture.queries].sort()).toEqual(expectations.map(([q]) => q).sort());
  });

  it.each(expectations)('"%s" ranks %s in the top 3', (q, id) => {
    expect(top(q)).toContain(id);
  });

  it('finds the answer to a question with no shared name at the very top', () => {
    expect(top('how do I stop people reusing leaked passwords', 1)).toEqual([
      'security/credential-stuffing',
    ]);
  });
});
