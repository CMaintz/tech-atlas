/**
 * `npm run embed` — embed every Term (name + aliases + summary + plain facet, per
 * language) with the multilingual e5 model and write the committed vector file that
 * the browser searches (A44). Also embeds FIXTURE_QUERIES for the offline ranking test.
 *
 * Run it after changing any term's name, aliases, summary or plain facet; the content
 * lint (E11) fails until you do. The model (~118 MB) is downloaded once and cached.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pipeline } from '@huggingface/transformers';
import {
  EMBED_LANGS,
  MODEL,
  queryText,
  quantize,
  toBase64,
  type VectorFile,
} from '../src/lib/semantic';
import { loadTerms } from './load-terms';
import { FIXTURE_PATH, FIXTURE_QUERIES, VECTORS_PATH, semanticInputs } from './semantic-inputs';

const { terms, errors } = loadTerms();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
const { ids, passages, inputHash } = semanticInputs(terms);

const extract = await pipeline('feature-extraction', MODEL.id, { dtype: MODEL.dtype });
async function embed(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 32) {
    const t = await extract(texts.slice(i, i + 32), { pooling: 'mean', normalize: true });
    out.push(...(t.tolist() as number[][]));
  }
  return out;
}

const vectors = await embed(passages);
const dim = vectors[0].length;
const file: VectorFile = {
  model: MODEL.id,
  dtype: MODEL.dtype,
  dim,
  langs: [...EMBED_LANGS],
  inputHash,
  ids,
  data: toBase64(quantize(vectors)),
};
mkdirSync(dirname(VECTORS_PATH), { recursive: true });
writeFileSync(VECTORS_PATH, JSON.stringify(file, null, 2) + '\n');

const queries = await embed(FIXTURE_QUERIES.map(queryText));
const fixture = { queries: FIXTURE_QUERIES, dim, data: toBase64(quantize(queries)) };
writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2) + '\n');

console.log(`${VECTORS_PATH}: ${ids.length} terms x ${EMBED_LANGS.length} languages, dim ${dim}`);
