/**
 * The `feedback` Edge Function (A100), as a handler with its dependencies passed in:
 * index.ts wires it to Deno, and the app's Vitest suite drives it with a mocked fetch
 * (app/src/lib/feedback-function.test.ts). No Deno APIs here.
 *
 * POST `{ category, message, email?, page?, lang, website? }` -> `{ ok: true }`. The row
 * is stored through `feedback_submit` (service role; it also enforces 5 an hour per
 * hashed IP and 50 a day in total), then the owner is emailed through Resend. A failed
 * or unconfigured email still answers success: the row is what matters. `website` is a
 * honeypot: a bot that fills it gets the same success answer and nothing is stored.
 *
 * Never log the message or the email address: only statuses reach the logs.
 */
import {
  RateLimiter,
  clientIp,
  corsHeaders,
  ipKey,
  readCapped,
} from "../semantic-search/logic.ts";

export const CATEGORIES = ["bug", "content", "idea", "other"] as const;
export type Category = (typeof CATEGORIES)[number];
export const MAX_MESSAGE_CHARS = 2000;
export const MAX_EMAIL_CHARS = 254;
export const MAX_PAGE_CHARS = 500;
/** A 2,000-character message is at most ~12 KB as escaped JSON. */
export const MAX_BODY_BYTES = 16_384;
/** One deadline for the database call and the email together. */
export const UPSTREAM_DEADLINE_MS = 8000;

export const FEEDBACK_TO = "cmaintz@outlook.com";
export const FEEDBACK_FROM = "Atlas <onboarding@resend.dev>";
export const RESEND_URL = "https://api.resend.com/emails";

const CATEGORY_NAMES: Record<Category, string> = {
  bug: "Bug",
  content: "Content error",
  idea: "Idea",
  other: "Other",
};

export type Feedback = {
  category: Category;
  message: string;
  email: string | null;
  page: string | null;
  lang: "en" | "da";
};

/** Deliberately loose: one @, a dot in the domain, no spaces or angle brackets. */
const EMAIL = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]+$/;

export const isEmail = (s: string) =>
  s.length <= MAX_EMAIL_CHARS && EMAIL.test(s);

/**
 * Validate the JSON body. `honeypot` is true when the hidden field was filled; the
 * caller then answers success without doing anything.
 */
export function parseFeedback(
  body: unknown,
):
  | { ok: true; honeypot: boolean; value: Feedback }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "expected a JSON object" };
  }
  const { category, message, email, page, lang, website } = body as Record<
    string,
    unknown
  >;
  if (
    typeof category !== "string" ||
    !(CATEGORIES as readonly string[]).includes(category)
  ) {
    return {
      ok: false,
      error: `\`category\` must be one of ${CATEGORIES.join(", ")}`,
    };
  }
  if (typeof message !== "string" || !message.trim()) {
    return { ok: false, error: "`message` must be a non-empty string" };
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return {
      ok: false,
      error: `\`message\` is longer than ${MAX_MESSAGE_CHARS} characters`,
    };
  }
  if (email !== undefined && email !== null && typeof email !== "string") {
    return { ok: false, error: "`email` must be a string" };
  }
  const mail = typeof email === "string" ? email.trim() : "";
  if (mail && !isEmail(mail)) {
    return { ok: false, error: "`email` is not an email address" };
  }
  if (page !== undefined && page !== null && typeof page !== "string") {
    return { ok: false, error: "`page` must be a string" };
  }
  if (typeof page === "string" && page.length > MAX_PAGE_CHARS) {
    return {
      ok: false,
      error: `\`page\` is longer than ${MAX_PAGE_CHARS} characters`,
    };
  }
  if (lang !== "en" && lang !== "da") {
    return { ok: false, error: '`lang` must be "en" or "da"' };
  }
  return {
    ok: true,
    honeypot: typeof website === "string" && website.trim() !== "",
    value: {
      category: category as Category,
      message: message.trim(),
      email: mail || null,
      page: typeof page === "string" && page.trim() ? page.trim() : null,
      lang,
    },
  };
}

/** "[Atlas feedback] Bug: the first few words…", one line, at most ~100 characters. */
export function subjectOf(f: Pick<Feedback, "category" | "message">): string {
  const words = f.message.replace(/[\r\n\t]+/g, " ").trim().split(/\s+/);
  let head = words.slice(0, 8).join(" ");
  if (head.length > 60) head = head.slice(0, 60).trimEnd();
  const more = head.length < words.join(" ").length ? "..." : "";
  // deno-lint-ignore no-control-regex
  const clean = (head + more).replace(/[\u0000-\u001f\u007f]/g, "");
  return `[Atlas feedback] ${CATEGORY_NAMES[f.category]}: ${clean}`;
}

/** The plain-text email body: every field, the message last. */
export function emailText(f: Feedback, at: Date): string {
  return [
    `Category: ${CATEGORY_NAMES[f.category]}`,
    `Reply to: ${f.email ?? "(not given)"}`,
    `Page: ${f.page ?? "(unknown)"}`,
    `Language: ${f.lang}`,
    `Received: ${at.toISOString()}`,
    "",
    f.message,
    "",
    "--",
    "Sent by the Atlas feedback form. Stored in private.feedback, deleted after 180 days.",
  ].join("\n");
}

/** The Resend API request body. */
export function resendPayload(f: Feedback, at: Date): Record<string, unknown> {
  return {
    from: FEEDBACK_FROM,
    to: [FEEDBACK_TO],
    subject: subjectOf(f),
    text: emailText(f, at),
    ...(f.email ? { reply_to: f.email } : {}),
  };
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export type Deps = {
  fetch: FetchLike;
  env: (name: string) => string | undefined;
  now?: () => number;
  limiter?: RateLimiter;
  log?: (msg: string) => void;
};

/** The in-isolate flood filter: at most 10 requests a minute per IP. */
export const floodFilter = () => new RateLimiter(10, 60_000);

/** Handle one request. */
export async function handleFeedback(req: Request, deps: Deps): Promise<Response> {
  const now = deps.now ?? Date.now;
  const log = deps.log ?? ((m: string) => console.error(m));
  const cors = corsHeaders(req.headers.get("origin"));
  const json = (
    body: unknown,
    status: number,
    extra: Record<string, string> = {},
  ) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        ...cors,
        ...extra,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  const tooMany = (retry: string) =>
    json({ error: "too many requests" }, 429, { "Retry-After": retry });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const ip = clientIp(req.headers);
  if (deps.limiter && !deps.limiter.allow(ip, now())) return tooMany("60");

  const raw = await readCapped(req.body, MAX_BODY_BYTES);
  if (!raw.ok) return json({ error: "request too large" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw.text);
  } catch {
    return json({ error: "expected a JSON body" }, 400);
  }
  const parsed = parseFeedback(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  if (parsed.honeypot) return json({ ok: true }, 200);
  const f = parsed.value;

  const supabaseUrl = deps.env("SUPABASE_URL");
  const serviceKey = deps.env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "feedback is not configured" }, 503);
  }

  const signal = AbortSignal.timeout(UPSTREAM_DEADLINE_MS);
  try {
    const res = await deps.fetch(`${supabaseUrl}/rest/v1/rpc/feedback_submit`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client: await ipKey(ip),
        category: f.category,
        message: f.message,
        reply_email: f.email,
        page: f.page,
        lang: f.lang,
      }),
      signal,
    });
    if (!res.ok) throw new Error(`feedback_submit: HTTP ${res.status}`);
    const answer: unknown = await res.json();
    if (answer === "limited") return tooMany("3600");
    if (answer !== "ok") throw new Error("feedback_submit: unexpected answer");
  } catch (err) {
    // Our own messages carry only a status; anything else is logged by name only.
    log(
      err instanceof Error && err.message.startsWith("feedback_submit")
        ? err.message
        : `feedback_submit: ${err instanceof Error ? err.name : "failed"}`,
    );
    return json({ error: "feedback could not be saved" }, 502);
  }

  const apiKey = deps.env("RESEND_API_KEY");
  if (!apiKey) {
    log("resend: RESEND_API_KEY not set, email skipped (row stored)");
    return json({ ok: true }, 200);
  }
  try {
    const res = await deps.fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload(f, new Date(now()))),
      signal,
    });
    if (!res.ok) log(`resend: HTTP ${res.status} (row stored)`);
  } catch (err) {
    log(`resend: ${err instanceof Error ? err.name : "failed"} (row stored)`);
  }
  return json({ ok: true }, 200);
}
