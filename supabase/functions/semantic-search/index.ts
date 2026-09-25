/**
 * `semantic-search` — Atlas's search by meaning (A74). POST `{ q, lang, k? }` →
 * `{ hits: [{ id, score }] }`, best first. The query is embedded with bge-m3 on
 * Cloudflare Workers AI (the model is too large for an Edge Function isolate, see A74),
 * then ranked against the term vectors in Postgres (pgvector, `match_terms`), each term
 * scoring its better language so Danish questions find English-named terms. The stored
 * vectors were embedded by the same Workers AI call (seed-vectors.ts, A75).
 *
 * Public and anonymous (deployed with --no-verify-jwt). Abuse limits (A76): CORS for the
 * site and localhost; body ≤ MAX_BODY_BYTES, counted while reading; q ≤ MAX_QUERY_CHARS;
 * per-IP per-minute and global per-day limits in Postgres (`search_allow`, service role
 * only), after a cheap in-isolate filter; one UPSTREAM_DEADLINE_MS deadline for the
 * whole upstream chain. Secrets: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN (set by
 * .github/workflows/backend.yml). SUPABASE_URL, SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY are injected by the platform (the legacy API keys).
 */
import {
  RateLimiter,
  UPSTREAM_DEADLINE_MS,
  clientIp,
  cloudflareEmbed,
  corsHeaders,
  ipKey,
  parseAllow,
  parseMatches,
  parseSearchRequest,
  readCapped,
  toVectorLiteral,
} from "./logic.ts";

const limiter = new RateLimiter();
let loggedPooling = false;

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"));
  const json = (
    body: unknown,
    status: number,
    extra: Record<string, string> = {},
  ) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, ...extra, "Content-Type": "application/json" },
    });
  const tooMany = () =>
    json({ error: "too many requests" }, 429, { "Retry-After": "60" });

  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const ip = clientIp(req.headers);
  if (!limiter.allow(ip, Date.now())) return tooMany();

  const raw = await readCapped(req.body);
  if (!raw.ok) return json({ error: "request too large" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw.text);
  } catch {
    return json({ error: "expected a JSON body" }, 400);
  }
  const parsed = parseSearchRequest(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { q, k } = parsed.value;

  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const token = Deno.env.get("CLOUDFLARE_API_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!accountId || !token || !supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "semantic search is not configured" }, 503);
  }

  // One deadline for everything upstream, so the answer (or the failure) comes in time
  // for the browser's 2 s budget.
  const signal = AbortSignal.timeout(UPSTREAM_DEADLINE_MS);
  const rpc = (fn: string, key: string, args: unknown) =>
    fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal,
    });

  try {
    const allowRes = await rpc("search_allow", serviceKey, {
      client: await ipKey(ip),
    });
    if (!allowRes.ok) throw new Error(`search_allow: HTTP ${allowRes.status}`);
    if (!parseAllow(await allowRes.json())) return tooMany();

    const { vectors, pooling } = await cloudflareEmbed([q], {
      accountId,
      token,
      signal,
    });
    if (!loggedPooling) {
      // Workers AI doesn't document bge-m3's pooling; the stored vectors come from the
      // same call, so this is informational, not a check.
      console.log(`Workers AI pooling: ${pooling ?? "(not reported)"}`);
      loggedPooling = true;
    }
    const res = await rpc("match_terms", anonKey, {
      query_embedding: toVectorLiteral(vectors[0]),
      match_count: k,
    });
    if (!res.ok)
      throw new Error(`match_terms: HTTP ${res.status} ${await res.text()}`);
    return json({ hits: parseMatches(await res.json()) }, 200);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return json({ error: "semantic search failed" }, 502);
  }
});
