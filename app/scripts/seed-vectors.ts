/**
 * `npm run seed:vectors` — fill Postgres `public.term_vectors` (A76): embed every term's
 * passages through Cloudflare Workers AI with **the same `cloudflareEmbed` call the
 * `semantic-search` function uses for queries**, upsert every (term, language) row, then
 * delete rows for terms that no longer exist. The stored and query vectors therefore
 * come from one service by construction; the committed vector file is only the lint's
 * hash source and must match the content (else this refuses to run). Idempotent; run by
 * .github/workflows/backend.yml after the migrations.
 *
 * Needs SUPABASE_URL, SUPABASE_SERVICE_KEY (secret / service_role key — CI reads it
 * with the Supabase CLI; never stored in the repo or shipped to the site),
 * CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import {
  EMBED_LANGS,
  compareVectors,
  toVectorLiteralRows,
  type VectorFile,
} from '../src/lib/semantic';
import { cloudflareEmbed } from '../../supabase/functions/semantic-search/logic';
import { loadTerms } from './load-terms';
import { VECTORS_PATH, semanticInputs } from './semantic-inputs';

const env = (name: string) => {
  const v = process.env[name];
  if (!v) {
    console.error(`${name} must be set`);
    process.exit(1);
  }
  return v;
};
const url = env('SUPABASE_URL');
const key = env('SUPABASE_SERVICE_KEY');
const accountId = env('CLOUDFLARE_ACCOUNT_ID');
const token = env('CLOUDFLARE_API_TOKEN');

const { terms, errors } = loadTerms();
if (errors.length) throw new Error(errors.join('\n'));
const inputs = semanticInputs(terms);
const file = JSON.parse(readFileSync(VECTORS_PATH, 'utf8')) as VectorFile;
const stale = compareVectors(file, inputs).errors;
if (stale.length) throw new Error(`${VECTORS_PATH} is out of date (${stale.join('; ')})`);

const vectors: number[][] = [];
const poolings = new Set<string>();
for (let i = 0; i < inputs.passages.length; i += 50) {
  const out = await cloudflareEmbed(inputs.passages.slice(i, i + 50), { accountId, token });
  vectors.push(...out.vectors);
  poolings.add(out.pooling ?? '(not reported)');
}
console.log(`Workers AI: ${vectors.length} passages embedded; pooling ${[...poolings].join(', ')}`);

const rows = toVectorLiteralRows(inputs.ids, EMBED_LANGS, vectors, inputs.passageHashes);
const db = createClient(url, key, { auth: { persistSession: false } });
for (let i = 0; i < rows.length; i += 100) {
  const { error } = await db.from('term_vectors').upsert(rows.slice(i, i + 100));
  if (error) throw new Error(`upsert: ${error.message}`);
}

const { data: existing, error: readError } = await db.from('term_vectors').select('id');
if (readError) throw new Error(`read: ${readError.message}`);
const keep = new Set(inputs.ids);
const removed = [...new Set((existing ?? []).map((r) => r.id as string))].filter(
  (id) => !keep.has(id),
);
if (removed.length) {
  const { error } = await db.from('term_vectors').delete().in('id', removed);
  if (error) throw new Error(`delete: ${error.message}`);
}
console.log(`term_vectors: ${rows.length} rows upserted, ${removed.length} removed term(s)`);
