/**
 * The exact inputs of the semantic vectors (A51), shared by `npm run embed` (which
 * writes them) and the content lint (which checks they are still in sync — E11/W8).
 */
import { createHash } from 'node:crypto';
import {
  EMBED_LANGS,
  EMBED_OPTIONS,
  MODEL,
  QUANTIZE_VERSION,
  passageText,
  type ExpectedVectors,
} from '../src/lib/semantic';
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
  'logging in with your fingerprint instead of a password',
  'a flaw attackers use before the vendor knows about it',
  'sneaking database commands into a login form',
  'nogen sidder skjult mellem to parter og læser med',
];

const sha = (x: unknown, len = 64) =>
  createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, len);

export function semanticInputs(terms: Map<string, Term>) {
  const ids = [...terms.keys()].sort();
  const perTerm = ids.map((id) => EMBED_LANGS.map((l) => passageText(terms.get(id)!, l)));
  const expected: ExpectedVectors = {
    settingsHash: sha({
      model: MODEL,
      embed: EMBED_OPTIONS,
      quantize: QUANTIZE_VERSION,
      langs: EMBED_LANGS,
    }),
    passageHashes: Object.fromEntries(ids.map((id, i) => [id, sha(perTerm[i], 16)])),
  };
  return { ids, passages: perTerm.flat(), ...expected };
}
