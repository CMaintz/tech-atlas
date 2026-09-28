/**
 * The `feedback` Edge Function (A100), as a handler with its dependencies passed in:
 * index.ts wires it to Deno, and the app's Vitest suite drives it with a mocked fetch
 * (app/src/lib/feedback-handler.test.ts). No Deno APIs here. The request is validated
 * in parse.ts and the email built in email.ts; both are re-exported from here.
 *
 * POST `{ category, message, email?, page?, lang, website? }` -> `{ ok: true }`. The row
 * is stored through `feedback_submit` (service role; it also enforces 5 an hour per
 * hashed IP and 50 a day in total), then the owner is emailed through Resend. A failed
 * or unconfigured email still answers success: the row is what matters.
 *
 * Never log the message or the email address: only statuses reach the logs.
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
import { RateLimiter } from "../_shared/rate-limit.ts";
import { type Reply, replyTo } from "../_shared/reply.ts";
import { RESEND_URL, resendPayload } from "./email.ts";
import { type Feedback, parseFeedback } from "./parse.ts";

export * from "./email.ts";
export * from "./parse.ts";

/** A 2,000-character message is at most ~12 KB as escaped JSON. */
export const MAX_BODY_BYTES = 16_384;
/** One deadline for the database call and the email together. */
export const UPSTREAM_DEADLINE_MS = 8000;

export type Deps = {
  fetch: FetchLike;
  env: EnvReader;
  now?: () => number;
  limiter?: RateLimiter;
  log?: (msg: string) => void;
};

/** The in-isolate flood filter: at most 10 requests a minute per IP. */
export const floodFilter = () => new RateLimiter(10, 60_000);

const STORE_ENV = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
type StoreEnv = Record<(typeof STORE_ENV)[number], string>;

/** Handle one request. */
export async function handleFeedback(req: Request, deps: Deps) {
  const reply = replyTo(req);
  const admitted = await admitJsonPost(req, reply, {
    maxBytes: MAX_BODY_BYTES,
    limiter: deps.limiter,
    now: deps.now ?? Date.now,
  });
  if (admitted instanceof Response) return admitted;
  const parsed = parseFeedback(admitted.body);
  if (!parsed.ok) return reply.json({ error: parsed.error }, 400);
  if (parsed.honeypot) return reply.json({ ok: true }, 200);
  const env = requireEnv(deps.env, STORE_ENV);
  if (!env) return reply.json({ error: "feedback is not configured" }, 503);
  return await deliver(reply, parsed.value, admitted.ip, env, deps);
}

/** Store the row, then email the owner. Only the row decides the answer. */
async function deliver(
  reply: Reply,
  f: Feedback,
  ip: string,
  env: StoreEnv,
  deps: Deps,
): Promise<Response> {
  const log = deps.log ?? ((m: string) => console.error(m));
  const db = rpcTarget(deps.fetch, env.SUPABASE_URL, UPSTREAM_DEADLINE_MS);
  const stored = await store(db, env.SUPABASE_SERVICE_ROLE_KEY, ip, f, log);
  if (stored === "limited") return reply.tooMany("3600");
  if (stored === "failed") {
    return reply.json({ error: "feedback could not be saved" }, 502);
  }
  const at = new Date((deps.now ?? Date.now)());
  await emailOwner(db, deps.env("RESEND_API_KEY"), resendPayload(f, at), log);
  return reply.json({ ok: true }, 200);
}

const errorName = (err: unknown) => err instanceof Error ? err.name : "failed";

/** The row stored, refused by the database's limits, or failed (logged). */
async function store(
  db: RpcTarget,
  serviceKey: string,
  ip: string,
  f: Feedback,
  log: (msg: string) => void,
): Promise<"ok" | "limited" | "failed"> {
  try {
    return await submit(db, serviceKey, ip, f);
  } catch (err) {
    // Our own messages carry only a status; anything else is logged by name only.
    log(
      err instanceof Error && err.message.startsWith("feedback_submit")
        ? err.message
        : `feedback_submit: ${errorName(err)}`,
    );
    return "failed";
  }
}

async function submit(
  db: RpcTarget,
  serviceKey: string,
  ip: string,
  f: Feedback,
): Promise<"ok" | "limited"> {
  const row = rowOf(f, await ipKey(ip));
  const res = await supabaseRpc(db, "feedback_submit", serviceKey, row);
  if (!res.ok) throw new Error(`feedback_submit: HTTP ${res.status}`);
  const answer: unknown = await res.json();
  if (answer === "ok" || answer === "limited") return answer;
  throw new Error("feedback_submit: unexpected answer");
}

/** The `feedback_submit` arguments: the hashed client key, never the address. */
const rowOf = (f: Feedback, client: string) => ({
  client,
  category: f.category,
  message: f.message,
  reply_email: f.email,
  page: f.page,
  lang: f.lang,
});

/** Send the email through Resend; skipped without a key, failures only logged. */
async function emailOwner(
  db: RpcTarget,
  apiKey: string | undefined,
  payload: Record<string, unknown>,
  log: (msg: string) => void,
): Promise<void> {
  if (!apiKey) {
    log("resend: RESEND_API_KEY not set, email skipped (row stored)");
    return;
  }
  try {
    const res = await db.fetch(RESEND_URL, resendRequest(apiKey, payload, db));
    if (!res.ok) log(`resend: HTTP ${res.status} (row stored)`);
  } catch (err) {
    log(`resend: ${errorName(err)} (row stored)`);
  }
}

function resendRequest(
  apiKey: string,
  payload: Record<string, unknown>,
  { signal }: RpcTarget,
): RequestInit {
  return {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  };
}
