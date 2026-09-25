/**
 * `npm run embed` — embed every Term (name + aliases + summary + plain facet, per
 * language) with bge-m3 and write the committed vector file (A76): the source of the
 * content lint's per-term hashes (E11/W8) and of the offline ranking test (with the
 * FIXTURE_QUERIES it also embeds). The database is NOT seeded from this file — CI
 * re-embeds every passage through Workers AI (scripts/seed-vectors.ts), so stored and
 * query vectors always come from the same service.
 *
 * Backend: with CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN set it calls Workers AI —
 * exactly the model the function embeds queries with. Otherwise it runs the
 * full-precision ONNX export of the same weights locally (a one-off ~2.3 GB download,
 * cached by transformers.js; several minutes on a laptop CPU).
 *
 * Run it after changing any term's name, aliases, summary or plain facet; the content
 * lint fails (E11) on an added/removed term and warns (W8) on changed text until you do.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  EMBED_LANGS,
  EMBED_OPTIONS,
  MODEL,
  queryText,
  quantize,
  toBase64,
  type VectorFile,
} from '../src/lib/semantic';
import { CLOUDFLARE_MODEL, cloudflareEmbed } from '../../supabase/functions/semantic-search/logic';
import { loadTerms } from './load-terms';
import { FIXTURE_PATH, FIXTURE_QUERIES, VECTORS_PATH, semanticInputs } from './semantic-inputs';

if (CLOUDFLARE_MODEL !== MODEL.cloudflare) throw new Error('function and embed models differ');

const { terms, errors } = loadTerms();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
const { ids, passages, settingsHash, passageHashes } = semanticInputs(terms);

type Embed = (texts: string[]) => Promise<number[][]>;

async function backend(): Promise<{ name: string; embed: Embed; batch: number }> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (accountId && token) {
    return {
      name: `cloudflare:${MODEL.cloudflare}`,
      embed: async (texts) => (await cloudflareEmbed(texts, { accountId, token })).vectors,
      batch: 50,
    };
  }
  // Loaded only here: the site itself never depends on transformers.js.
  const { pipeline } = await import('@huggingface/transformers');
  const extract = await pipeline('feature-extraction', MODEL.onnx.id, {
    dtype: MODEL.onnx.dtype,
    revision: MODEL.onnx.revision,
  });
  return {
    name: `onnx:${MODEL.onnx.id}@${MODEL.onnx.revision.slice(0, 7)}:${MODEL.onnx.dtype}`,
    embed: async (texts) => (await extract(texts, EMBED_OPTIONS)).tolist() as number[][],
    batch: 8,
  };
}

const { name, embed, batch } = await backend();
console.log(`embedding ${passages.length} passages with ${name}`);

async function embedAll(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += batch) {
    out.push(...(await embed(texts.slice(i, i + batch))));
    process.stdout.write(`\r${Math.min(i + batch, texts.length)}/${texts.length}`);
  }
  process.stdout.write('\n');
  return out;
}

const vectors = await embedAll(passages);
const dim = vectors[0].length;
if (dim !== MODEL.dim) throw new Error(`expected ${MODEL.dim} dimensions, got ${dim}`);
const file: VectorFile = {
  model: MODEL.id,
  backend: name,
  dim,
  langs: [...EMBED_LANGS],
  settingsHash,
  passageHashes,
  ids,
  data: toBase64(quantize(vectors)),
};
mkdirSync(dirname(VECTORS_PATH), { recursive: true });
writeFileSync(VECTORS_PATH, JSON.stringify(file, null, 2) + '\n');

const queries = await embedAll(FIXTURE_QUERIES.map(queryText));
const fixture = { queries: FIXTURE_QUERIES, dim, data: toBase64(quantize(queries)) };
writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2) + '\n');

console.log(`${VECTORS_PATH}: ${ids.length} terms x ${EMBED_LANGS.length} languages, dim ${dim}`);
