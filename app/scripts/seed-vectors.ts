/**
 * `npm run seed:vectors` — load the committed term vectors (supabase/seed/term-vectors.json)
 * into Postgres `public.term_vectors` (A61): upsert every (term, language) row, then
 * delete rows for terms that no longer exist. Idempotent; run by
 * .github/workflows/backend.yml after the migrations.
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_KEY (the secret / service_role key — CI reads
 * it with the Supabase CLI; it is never stored in the repository or shipped to the site).
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { MODEL, vectorRows, type VectorFile } from '../src/lib/semantic';
import { VECTORS_PATH } from './semantic-inputs';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  process.exit(1);
}

const file = JSON.parse(readFileSync(VECTORS_PATH, 'utf8')) as VectorFile;
if (file.model !== MODEL.id || file.dim !== MODEL.dim) {
  console.error(`${VECTORS_PATH} was embedded with ${file.model}/${file.dim}, not ${MODEL.id}`);
  process.exit(1);
}
const rows = vectorRows(file);

const db = createClient(url, key, { auth: { persistSession: false } });
for (let i = 0; i < rows.length; i += 100) {
  const { error } = await db.from('term_vectors').upsert(rows.slice(i, i + 100));
  if (error) throw new Error(`upsert: ${error.message}`);
}

const { data: existing, error: readError } = await db.from('term_vectors').select('id');
if (readError) throw new Error(`read: ${readError.message}`);
const keep = new Set(file.ids);
const removed = [...new Set((existing ?? []).map((r) => r.id as string))].filter(
  (id) => !keep.has(id),
);
if (removed.length) {
  const { error } = await db.from('term_vectors').delete().in('id', removed);
  if (error) throw new Error(`delete: ${error.message}`);
}
console.log(`term_vectors: ${rows.length} rows upserted, ${removed.length} removed term(s)`);
