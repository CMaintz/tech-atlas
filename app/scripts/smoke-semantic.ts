import { SMOKE_QUERIES } from './semantic-inputs';

function semanticSearchUrl(): string {
  const value = process.env.SEMANTIC_SEARCH_URL;
  if (!value) {
    console.error('SEMANTIC_SEARCH_URL must be set');
    process.exit(1);
  }
  return value;
}
const url = semanticSearchUrl();

async function ask(q: string, lang: string): Promise<string[]> {
  let last = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
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
