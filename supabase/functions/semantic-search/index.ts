/**
 * `semantic-search` — Atlas's search by meaning (A61). POST `{ q, lang, k? }` →
 * `{ hits: [{ id, score }] }`, best first. The query is embedded with bge-m3 on
 * Cloudflare Workers AI (the model is too large for an Edge Function isolate, see A61),
 * then ranked against the term vectors in Postgres (pgvector, `match_terms`), each term
 * scoring its better language so Danish questions find English-named terms.
 *
 * Public and anonymous (deployed with --no-verify-jwt): CORS allows the site and
 * localhost, queries are capped at MAX_QUERY_CHARS, and each IP gets RATE_LIMIT
 * requests a minute per isolate. Secrets: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN
 * (set by .github/workflows/backend.yml). SUPABASE_URL / SUPABASE_ANON_KEY are
 * provided by the platform; the read uses the anon role, so RLS applies.
 */
import {
  RateLimiter,
  clientIp,
  cloudflareEmbed,
  corsHeaders,
  parseMatches,
  parseSearchRequest,
  toVectorLiteral,
} from './logic.ts';

const limiter = new RateLimiter();
const UPSTREAM_TIMEOUT_MS = 1500;

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('origin'));
  const json = (body: unknown, status: number, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, ...extra, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (!limiter.allow(clientIp(req.headers), Date.now())) {
    return json({ error: 'too many requests' }, 429, { 'Retry-After': '60' });
  }
  if (Number(req.headers.get('content-length') ?? 0) > 2048) {
    return json({ error: 'request too large' }, 413);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'expected a JSON body' }, 400);
  }
  const parsed = parseSearchRequest(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { q, k } = parsed.value;

  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const token = Deno.env.get('CLOUDFLARE_API_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!accountId || !token || !supabaseUrl || !anonKey) {
    return json({ error: 'semantic search is not configured' }, 503);
  }

  try {
    const [vector] = await cloudflareEmbed([q], {
      accountId,
      token,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/match_terms`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_embedding: toVectorLiteral(vector), match_count: k }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`match_terms: HTTP ${res.status} ${await res.text()}`);
    return json({ hits: parseMatches(await res.json()) }, 200);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return json({ error: 'semantic search failed' }, 502);
  }
});
