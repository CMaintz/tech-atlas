import { createHash } from 'node:crypto';
import {
  EMBED_LANGS,
  EMBED_OPTIONS,
  MODEL,
  PASSAGE_FORMAT,
  QUANTIZE_VERSION,
  passageText,
  type ExpectedVectors,
} from '../src/lib/semantic';
import type { Term } from './load-terms';

export const VECTORS_PATH = '../supabase/seed/term-vectors.json';

export const SMOKE_QUERIES: [query: string, lang: 'en' | 'da', expected: string][] = [
  ['hvem har ansvaret for persondata', 'da', 'security/data-controller'],
  ['a program that locks your files and demands money', 'en', 'security/ransomware'],
  ['sneaking database commands into a login form', 'en', 'security/sql-injection'],
];

const sha = (x: unknown, len = 64) =>
  createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, len);

export function semanticInputs(terms: Map<string, Term>) {
  const sorted = [...terms].sort(([a], [b]) => (a < b ? -1 : 1));
  const ids = sorted.map(([id]) => id);
  const perTerm = sorted.map(([, term]) => EMBED_LANGS.map((l) => passageText(term, l)));
  const expected: ExpectedVectors = {
    settingsHash: sha({
      model: MODEL.id,
      dim: MODEL.dim,
      embed: EMBED_OPTIONS,
      passage: PASSAGE_FORMAT,
      quantize: QUANTIZE_VERSION,
      langs: EMBED_LANGS,
    }),
    passageHashes: Object.fromEntries(ids.map((id, i) => [id, sha(perTerm[i], 16)])),
  };
  return { ids, passages: perTerm.flat(), ...expected };
}
