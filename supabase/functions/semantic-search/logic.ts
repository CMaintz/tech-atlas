/**
 * The pure half of the `semantic-search` Edge Function (A61): request validation, CORS,
 * a per-IP rate limit and the Cloudflare Workers AI embedding call. No Deno APIs, so
 * the app's Vitest suite tests it and `npm run embed` reuses the same Cloudflare client
 * (app/src/lib/semantic-function.test.ts, app/scripts/embed.ts).
 */

/** The embedding model behind the function — the same one `npm run embed` uses. */
export const CLOUDFLARE_MODEL = '@cf/baai/bge-m3';
export const DIM = 1024;

/** Longest query embedded; longer ones are rejected (a question, not a document). */
export const MAX_QUERY_CHARS = 200;
export const DEFAULT_K = 8;
export const MAX_K = 20;
/** Requests per IP per window, per isolate (best effort; isolates are short-lived). */
export const RATE_LIMIT = 30;
export const RATE_WINDOW_MS = 60_000;

export type Lang = 'en' | 'da';

export type SearchRequest = { q: string; lang: Lang; k: number };

/** Validate the JSON body `{ q, lang, k? }`. */
export function parseSearchRequest(
  body: unknown,
): { ok: true; value: SearchRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'expected a JSON object' };
  const { q, lang, k } = body as Record<string, unknown>;
  if (typeof q !== 'string' || !q.trim()) return { ok: false, error: '`q` must be a string' };
  if (q.length > MAX_QUERY_CHARS) {
    return { ok: false, error: `\`q\` is longer than ${MAX_QUERY_CHARS} characters` };
  }
  if (lang !== 'en' && lang !== 'da') return { ok: false, error: '`lang` must be "en" or "da"' };
  if (k !== undefined && (typeof k !== 'number' || !Number.isInteger(k) || k < 1 || k > MAX_K)) {
    return { ok: false, error: `\`k\` must be an integer from 1 to ${MAX_K}` };
  }
  return { ok: true, value: { q: q.trim(), lang, k: (k as number | undefined) ?? DEFAULT_K } };
}

/** The deployed site, plus any local dev server. */
export function allowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (origin === 'https://cmaintz.github.io') return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(origin);
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const base: Record<string, string> = { Vary: 'Origin' };
  if (!allowedOrigin(origin)) return base;
  return {
    ...base,
    'Access-Control-Allow-Origin': origin!,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
    'Access-Control-Max-Age': '86400',
  };
}

/** The caller's IP as the Supabase gateway reports it (first X-Forwarded-For hop). */
export function clientIp(headers: { get(name: string): string | null }): string {
  const xff = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return xff || headers.get('cf-connecting-ip') || headers.get('x-real-ip') || 'unknown';
}

/** Fixed-window counter per key. Old windows are dropped as keys are seen. */
export class RateLimiter {
  private windows = new Map<string, { start: number; count: number }>();
  constructor(
    private limit = RATE_LIMIT,
    private windowMs = RATE_WINDOW_MS,
  ) {}

  allow(key: string, now: number): boolean {
    if (this.windows.size > 10_000) {
      for (const [k, w] of this.windows) if (now - w.start >= this.windowMs) this.windows.delete(k);
    }
    const w = this.windows.get(key);
    if (!w || now - w.start >= this.windowMs) {
      this.windows.set(key, { start: now, count: 1 });
      return true;
    }
    w.count += 1;
    return w.count <= this.limit;
  }
}

export function normalize(v: ArrayLike<number>): number[] {
  let n = 0;
  for (let i = 0; i < v.length; i++) n += v[i] * v[i];
  n = Math.sqrt(n);
  return Array.from(v, (x) => (n ? x / n : 0));
}

/** pgvector's text form, e.g. `[0.1,0.2]`. */
export const toVectorLiteral = (v: ArrayLike<number>) => `[${Array.from(v).join(',')}]`;

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Embed texts with Cloudflare Workers AI (REST). Returns unit vectors, one per text.
 * Throws on any HTTP, API or shape error — callers fall back rather than guess.
 */
export async function cloudflareEmbed(
  texts: string[],
  opts: { accountId: string; token: string; fetch?: FetchLike; signal?: AbortSignal },
): Promise<number[][]> {
  const doFetch = opts.fetch ?? fetch;
  const res = await doFetch(
    `https://api.cloudflare.com/client/v4/accounts/${opts.accountId}/ai/run/${CLOUDFLARE_MODEL}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${opts.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texts, truncate_inputs: true }),
      signal: opts.signal,
    },
  );
  if (!res.ok) throw new Error(`Workers AI: HTTP ${res.status}`);
  return parseCloudflareEmbedding(await res.json(), texts.length);
}

export function parseCloudflareEmbedding(json: unknown, expected: number): number[][] {
  const body = json as {
    success?: boolean;
    result?: { data?: unknown; pooling?: string };
  };
  if (!body || body.success === false) throw new Error('Workers AI: request failed');
  const data = body.result?.data;
  if (body.result?.pooling && body.result.pooling !== 'cls') {
    throw new Error(`Workers AI: unexpected pooling ${body.result.pooling}`);
  }
  if (
    !Array.isArray(data) ||
    data.length !== expected ||
    !data.every(
      (v) => Array.isArray(v) && v.length === DIM && v.every((x) => typeof x === 'number'),
    )
  ) {
    throw new Error('Workers AI: unexpected response shape');
  }
  return (data as number[][]).map(normalize);
}

/** One row of the `match_terms` RPC. */
export type Hit = { id: string; score: number };

export function parseMatches(json: unknown): Hit[] {
  if (!Array.isArray(json)) throw new Error('match_terms: expected an array');
  return json.map((r) => {
    const { id, score } = (r ?? {}) as Record<string, unknown>;
    if (typeof id !== 'string' || typeof score !== 'number') {
      throw new Error('match_terms: unexpected row');
    }
    return { id, score };
  });
}
