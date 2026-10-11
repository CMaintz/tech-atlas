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
type Backend = { name: string; embed: Embed; batch: number };

async function backend(): Promise<Backend> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  return accountId && token ? cloudflareBackend(accountId, token) : await onnxBackend();
}

function cloudflareBackend(accountId: string, token: string): Backend {
  return {
    name: `cloudflare:${MODEL.cloudflare}`,
    embed: async (texts) => (await cloudflareEmbed(texts, { accountId, token })).vectors,
    batch: 50,
  };
}

async function onnxBackend(): Promise<Backend> {
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
