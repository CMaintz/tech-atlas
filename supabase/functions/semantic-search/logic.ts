/**
 * The pure half of the `semantic-search` Edge Function: its limits, request
 * validation and the database answers it parses. No Deno APIs, so the app's Vitest
 * suite tests it (app/src/lib/semantic-function.test.ts). It also re-exports the
 * shared request plumbing (../_shared) and the Workers AI client (cloudflare.ts) under
 * the names the tests and scripts have always imported from here.
 */
import { readCapped as readCappedTo } from "../_shared/body.ts";
import { type Lang, langError } from "../_shared/lang.ts";
import { RateLimiter } from "../_shared/rate-limit.ts";

export { allowedOrigin, corsHeaders } from "../_shared/cors.ts";
export { clientIp, ipKey } from "../_shared/client.ts";
export { RateLimiter } from "../_shared/rate-limit.ts";
export type { Lang } from "../_shared/lang.ts";
export {
  CLOUDFLARE_MODEL,
  cloudflareEmbed,
  DIM,
  type Embedded,
  normalize,
  parseCloudflareEmbedding,
} from "./cloudflare.ts";

/** Longest query embedded; longer ones are rejected (a question, not a document). */
export const MAX_QUERY_CHARS = 200;
export const DEFAULT_K = 8;
export const MAX_K = 20;
/**
 * Requests per IP per minute. Enforced in Postgres (`search_allow`, shared by every
 * isolate) together with a global daily cap; the in-isolate limiter only spares the
 * database a round trip for an obvious flood.
 */
export const RATE_LIMIT = 30;
export const RATE_WINDOW_MS = 60_000;
/** Largest request body read, in bytes (a 200-character query is well under this). */
export const MAX_BODY_BYTES = 2048;
/** One deadline for the whole upstream chain: rate check, Workers AI, match_terms. */
export const UPSTREAM_DEADLINE_MS = 5500;

/** The in-isolate flood filter: at most RATE_LIMIT requests a window per IP. */
export const floodFilter = () => new RateLimiter(RATE_LIMIT, RATE_WINDOW_MS);

/** Read a request body, refusing more than `maxBytes` (default MAX_BODY_BYTES). */
export const readCapped = (
  body: ReadableStream<Uint8Array> | null,
  maxBytes = MAX_BODY_BYTES,
) => readCappedTo(body, maxBytes);

export type SearchRequest = { q: string; lang: Lang; k: number };

/** Validate the JSON body `{ q, lang, k? }`. */
export function parseSearchRequest(
  body: unknown,
): { ok: true; value: SearchRequest } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "expected a JSON object" };
  }
  const { q, lang, k } = body as Record<string, unknown>;
  const error = queryError(q) ?? langError(lang) ?? countError(k);
  if (error) return { ok: false, error };
  return {
    ok: true,
    value: {
      q: (q as string).trim(),
      lang: lang as Lang,
      k: (k as number | undefined) ?? DEFAULT_K,
    },
  };
}

function queryError(q: unknown): string | null {
  if (typeof q !== "string" || !q.trim()) return "`q` must be a string";
  if (q.length > MAX_QUERY_CHARS) {
    return `\`q\` is longer than ${MAX_QUERY_CHARS} characters`;
  }
  return null;
}

function countError(k: unknown): string | null {
  if (k === undefined) return null;
  if (typeof k === "number" && Number.isInteger(k) && k >= 1 && k <= MAX_K) {
    return null;
  }
  return `\`k\` must be an integer from 1 to ${MAX_K}`;
}

/** pgvector's text form, e.g. `[0.1,0.2]`. */
export const toVectorLiteral = (v: ArrayLike<number>) =>
  `[${Array.from(v).join(",")}]`;

/** The `search_allow` RPC answers a bare JSON boolean; anything else is an error. */
export function parseAllow(json: unknown): boolean {
  if (typeof json !== "boolean") {
    throw new Error("search_allow: expected a boolean");
  }
  return json;
}

/** One row of the `match_terms` RPC. */
export type Hit = { id: string; score: number };

export function parseMatches(json: unknown): Hit[] {
  if (!Array.isArray(json)) throw new Error("match_terms: expected an array");
  return json.map((r) => {
    const { id, score } = (r ?? {}) as Record<string, unknown>;
    if (typeof id !== "string" || typeof score !== "number") {
      throw new Error("match_terms: unexpected row");
    }
    return { id, score };
  });
}
