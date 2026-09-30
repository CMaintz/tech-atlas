/**
 * `semantic-search` — Atlas's search by meaning. POST `{ q, lang, k? }` →
 * `{ hits: [{ id, score }] }`, best first. The query is embedded with bge-m3 on
 * Cloudflare Workers AI (the model is too large for an Edge Function isolate),
 * then ranked against the term vectors in Postgres (pgvector, `match_terms`), each term
 * scoring its better language so Danish questions find English-named terms. The stored
 * vectors were embedded by the same Workers AI call (seed-vectors.ts). The handler
 * lives in handler.ts, unit-tested with a mocked fetch.
 *
 * Public and anonymous (deployed with --no-verify-jwt). Abuse limits: CORS for the
 * site and localhost; body ≤ MAX_BODY_BYTES, counted while reading; q ≤ MAX_QUERY_CHARS;
 * per-IP per-minute and global per-day limits in Postgres (`search_allow`, service role
 * only), after a cheap in-isolate filter; one UPSTREAM_DEADLINE_MS deadline for the
 * whole upstream chain. Secrets: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN (set by
 * .github/workflows/backend.yml). SUPABASE_URL, SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY are injected by the platform (the legacy API keys).
 */
import { handleSearch, logPoolingOnce } from "./handler.ts";
import { floodFilter } from "./logic.ts";

const limiter = floodFilter();
const notePooling = logPoolingOnce((msg) => console.log(msg));

Deno.serve((req) =>
  handleSearch(req, {
    fetch: (url, init) => fetch(url, init),
    env: (name) => Deno.env.get(name),
    limiter,
    logError: (err) => console.error(err),
    notePooling,
  })
);
