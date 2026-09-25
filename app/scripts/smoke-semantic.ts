/**
 * `npm run smoke:semantic` — ask the deployed `semantic-search` function the
 * SMOKE_QUERIES and fail unless each expected term is in its top 3 (A76). Run by
 * .github/workflows/backend.yml after seeding; needs SEMANTIC_SEARCH_URL.
 */
import { SMOKE_QUERIES } from './semantic-inputs';

const url = process.env.SEMANTIC_SEARCH_URL;
if (!url) {
  console.error('SEMANTIC_SEARCH_URL must be set');
  process.exit(1);
}

/** A fresh deploy can cold-start; retry a failed request a couple of times. */
async function ask(q: string, lang: string): Promise<string[]> {
  let last = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, lang, k: 3 }),
      signal: AbortSignal.timeout(15_000),
    }).catch((e: unknown) => (e instanceof Error ? e : new Error(String(e))));
    if (res instanceof Response && res.ok) {
      const body = (await res.json()) as { hits: { id: string }[] };
      return body.hits.map((h) => h.id);
    }
    last = res instanceof Response ? `HTTP ${res.status} ${await res.text()}` : res.message;
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`"${q}": ${last}`);
}

let failed = 0;
for (const [q, lang, expected] of SMOKE_QUERIES) {
  const top = await ask(q, lang);
  const ok = top.includes(expected);
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} "${q}" -> ${top.join(', ')} (want ${expected})`);
}
if (failed) {
  console.error(`${failed} smoke queries missed their term`);
  process.exit(1);
}
