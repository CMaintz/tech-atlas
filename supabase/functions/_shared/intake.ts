/**
 * The front door both functions share: answer the CORS preflight, refuse anything
 * but POST, spare an obvious flood (in-isolate limiter, keyed by IP), then read a
 * capped JSON body. What gets through is the caller's IP and the parsed body.
 */
import { readJsonBody } from "./body.ts";
import { clientIp } from "./client.ts";
import type { RateLimiter } from "./rate-limit.ts";
import type { Reply } from "./reply.ts";

export type IntakeOptions = {
  maxBytes: number;
  limiter?: RateLimiter;
  now: () => number;
};

export type Admitted = { ip: string; body: unknown };

/** The admitted request, or the Response that turns it away. */
export async function admitJsonPost(
  req: Request,
  reply: Reply,
  opts: IntakeOptions,
): Promise<Admitted | Response> {
  if (req.method === "OPTIONS") return reply.preflight();
  if (req.method !== "POST") {
    return reply.json({ error: "method not allowed" }, 405);
  }
  const ip = clientIp(req.headers);
  if (opts.limiter && !opts.limiter.allow(ip, opts.now())) {
    return reply.tooMany("60");
  }
  const body = await readJsonBody(req.body, opts.maxBytes);
  if (!body.ok) return reply.json({ error: body.error }, body.status);
  return { ip, body: body.value };
}
