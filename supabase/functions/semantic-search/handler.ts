/**
 * The `semantic-search` Edge Function (A75) as a handler with its dependencies passed
 * in: index.ts wires it to Deno, and the app's Vitest suite drives it with a mocked
 * fetch (app/src/lib/semantic-handler.test.ts). No Deno APIs here.
 *
 * After the shared front door (CORS, POST only, flood filter, capped JSON body), the
 * request is validated, the caller checked against the Postgres limits
 * (`search_allow`), the query embedded by Workers AI and ranked by `match_terms`.
 */
import { ipKey } from "../_shared/client.ts";
import { admitJsonPost } from "../_shared/intake.ts";
import {
  type EnvReader,
  type FetchLike,
  requireEnv,
  type RpcTarget,
  rpcTarget,
  supabaseRpc,
} from "../_shared/platform.ts";
import type { RateLimiter } from "../_shared/rate-limit.ts";
import { type Reply, replyTo } from "../_shared/reply.ts";
import { cloudflareEmbed } from "./cloudflare.ts";
import {
  type Hit,
  MAX_BODY_BYTES,
  parseAllow,
  parseMatches,
  parseSearchRequest,
  type SearchRequest,
  toVectorLiteral,
  UPSTREAM_DEADLINE_MS,
} from "./logic.ts";

export type SearchDeps = {
  fetch: FetchLike;
  env: EnvReader;
  now?: () => number;
  limiter?: RateLimiter;
  /** Where an upstream failure is reported (an Error's message, else the value). */
  logError?: (err: unknown) => void;
  /** Told the pooling Workers AI reports, on every embedding. */
  notePooling?: (pooling: string | undefined) => void;
};

const ENV_NAMES = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;
type SearchEnv = Record<(typeof ENV_NAMES)[number], string>;
const UNCONFIGURED = { error: "semantic search is not configured" };

/** Handle one request. */
export async function handleSearch(req: Request, deps: SearchDeps) {
  const reply = replyTo(req);
  const admitted = await admitJsonPost(req, reply, {
    maxBytes: MAX_BODY_BYTES,
    limiter: deps.limiter,
    now: deps.now ?? Date.now,
  });
  if (admitted instanceof Response) return admitted;
  const parsed = parseSearchRequest(admitted.body);
  if (!parsed.ok) return reply.json({ error: parsed.error }, 400);
  const env = requireEnv(deps.env, ENV_NAMES);
  if (!env) return reply.json(UNCONFIGURED, 503);
  const { ip } = admitted;
  return await answer(reply, deps, () => search(parsed.value, ip, env, deps));
}

/** 200 with the hits, 429 when limited, 502 (logged) when anything upstream fails. */
async function answer(
  reply: Reply,
  deps: SearchDeps,
  run: () => Promise<Hit[] | null>,
): Promise<Response> {
  try {
    const hits = await run();
    return hits ? reply.json({ hits }, 200) : reply.tooMany("60");
  } catch (err) {
    const logError = deps.logError ?? ((e: unknown) => console.error(e));
    logError(err instanceof Error ? err.message : err);
    return reply.json({ error: "semantic search failed" }, 502);
  }
}

/** The ranked hits, or null when the database says the caller is over its limit. */
async function search(
  { q, k }: SearchRequest,
  ip: string,
  env: SearchEnv,
  deps: SearchDeps,
): Promise<Hit[] | null> {
  // One deadline for everything upstream, so the answer (or the failure) comes in time
  // for the browser's 6 s budget (name results show meanwhile; cold starts need the slack).
  const db = rpcTarget(deps.fetch, env.SUPABASE_URL, UPSTREAM_DEADLINE_MS);
  if (!(await allowed(db, env.SUPABASE_SERVICE_ROLE_KEY, ip))) return null;
  const { vectors, pooling } = await cloudflareEmbed([q], {
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    token: env.CLOUDFLARE_API_TOKEN,
    fetch: deps.fetch,
    signal: db.signal,
  });
  deps.notePooling?.(pooling);
  return await matchTerms(db, env.SUPABASE_ANON_KEY, vectors[0], k);
}

/** The Postgres per-IP and daily limits (`search_allow`, service role only). */
async function allowed(db: RpcTarget, serviceKey: string, ip: string) {
  const res = await supabaseRpc(db, "search_allow", serviceKey, {
    client: await ipKey(ip),
  });
  if (!res.ok) throw new Error(`search_allow: HTTP ${res.status}`);
  return parseAllow(await res.json());
}

async function matchTerms(
  db: RpcTarget,
  anonKey: string,
  vector: number[],
  k: number,
): Promise<Hit[]> {
  const res = await supabaseRpc(db, "match_terms", anonKey, {
    query_embedding: toVectorLiteral(vector),
    match_count: k,
  });
  if (!res.ok) {
    throw new Error(`match_terms: HTTP ${res.status} ${await res.text()}`);
  }
  return parseMatches(await res.json());
}

/**
 * A `notePooling` that logs once per isolate. Workers AI doesn't document bge-m3's
 * pooling; the stored vectors come from the same call, so this is informational, not
 * a check.
 */
export function logPoolingOnce(log: (msg: string) => void) {
  let logged = false;
  return (pooling: string | undefined) => {
    if (logged) return;
    log(`Workers AI pooling: ${pooling ?? "(not reported)"}`);
    logged = true;
  };
}
