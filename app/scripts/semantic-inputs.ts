/**
 * The exact inputs of the semantic vectors (A44), shared by `npm run embed` (which
 * writes them) and the content lint (which checks they are still in sync — E11).
 */
import { createHash } from 'node:crypto';
import { EMBED_LANGS, MODEL, passageText } from '../src/lib/semantic';
import type { Term } from './load-terms';

export const VECTORS_PATH = 'public/semantic/vectors.json';
export const FIXTURE_PATH = 'src/lib/semantic.fixture.json';

/** Queries embedded alongside the terms, so a unit test can check real rankings offline. */
export const FIXTURE_QUERIES = [
  'how do I stop people reusing leaked passwords',
  'hvordan forhindrer jeg at folk genbruger lækkede adgangskoder',
  'a program that locks your files and demands money',
  'når sprogmodellen finder på ting der ikke er sande',
  'falske mails der lokker folk til at give deres kodeord',
  'proving who you are when you log in',
  'kopier af data så vi kan gendanne efter et nedbrud',
  'model learns the training examples too well and fails on new data',
  'a list of all the software components in a product',
  'hvem har ansvaret for persondata',
  'tricking someone on the phone into giving information',
  'giving users only the access they need',
];

export function semanticInputs(terms: Map<string, Term>) {
  const ids = [...terms.keys()].sort();
  const passages = ids.flatMap((id) => EMBED_LANGS.map((l) => passageText(terms.get(id)!, l)));
  const inputHash = createHash('sha256')
    .update(JSON.stringify({ model: MODEL, langs: EMBED_LANGS, ids, passages }))
    .digest('hex');
  return { ids, passages, inputHash };
}
