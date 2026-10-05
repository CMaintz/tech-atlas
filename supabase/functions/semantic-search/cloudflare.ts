/**
 * The Cloudflare Workers AI embedding client — the one code path used both
 * for queries (the function) and for the stored term vectors (seed-vectors.ts,
 * `npm run embed`), so the two always come from the same service. No Deno APIs.
 */
import type { FetchLike } from "../_shared/platform.ts";

/** The embedding model behind the function — the same one `npm run embed` uses. */
export const CLOUDFLARE_MODEL = "@cf/baai/bge-m3";
export const DIM = 1024;

/** Unit vectors, one per text, and the pooling Workers AI reports (not documented for bge-m3). */
export type Embedded = { vectors: number[][]; pooling?: string };

export type CloudflareOptions = {
  accountId: string;
  token: string;
  fetch?: FetchLike;
  signal?: AbortSignal;
};

export function normalize(v: ArrayLike<number>): number[] {
  let n = 0;
  for (let i = 0; i < v.length; i++) n += v[i] * v[i];
  n = Math.sqrt(n);
  return Array.from(v, (x) => (n ? x / n : 0));
}

/** Embed texts with Workers AI (REST). Throws on any HTTP, API or shape error. */
export async function cloudflareEmbed(
  texts: string[],
  opts: CloudflareOptions,
): Promise<Embedded> {
  const doFetch = opts.fetch ?? fetch;
  const res = await doFetch(
    `https://api.cloudflare.com/client/v4/accounts/${opts.accountId}/ai/run/${CLOUDFLARE_MODEL}`,
    embedRequest(texts, opts),
  );
  if (!res.ok) throw new Error(`Workers AI: HTTP ${res.status}`);
  return parseCloudflareEmbedding(await res.json(), texts.length);
}

function embedRequest(texts: string[], opts: CloudflareOptions): RequestInit {
  return {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: texts, truncate_inputs: true }),
    signal: opts.signal,
  };
}

type CloudflareBody = {
  success?: boolean;
  result?: { data?: unknown; pooling?: unknown };
};

export function parseCloudflareEmbedding(
  json: unknown,
  expected: number,
): Embedded {
  const body = json as CloudflareBody | null;
  if (!body || body.success === false) {
    throw new Error("Workers AI: request failed");
  }
  const data = body.result?.data;
  if (!isVectorList(data, expected)) {
    throw new Error("Workers AI: unexpected response shape");
  }
  const pooling = body.result?.pooling;
  return {
    vectors: data.map(normalize),
    pooling: typeof pooling === "string" ? pooling : undefined,
  };
}

/** Exactly `expected` vectors of DIM numbers each. */
function isVectorList(data: unknown, expected: number): data is number[][] {
  return (
    Array.isArray(data) &&
    data.length === expected &&
    data.every(
      (v) =>
        Array.isArray(v) &&
        v.length === DIM &&
        v.every((x) => typeof x === "number"),
    )
  );
}
