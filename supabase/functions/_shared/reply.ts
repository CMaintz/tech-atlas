/** The functions' answers: JSON (never cached, never sniffed) and the CORS preflight. */
import { corsHeaders } from "./cors.ts";

export type Reply = {
  json: (
    body: unknown,
    status: number,
    extra?: Record<string, string>,
  ) => Response;
  /** 429 "too many requests", retry after `retryAfter` seconds. */
  tooMany: (retryAfter: string) => Response;
  /** 204 with the CORS headers. */
  preflight: () => Response;
};

/** Answers carrying the CORS headers for the request's origin. */
export function replyTo(req: Request): Reply {
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
        // Answers are per request and never meant to be rendered as a page.
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  return {
    json,
    tooMany: (retryAfter) =>
      json({ error: "too many requests" }, 429, { "Retry-After": retryAfter }),
    preflight: () => new Response(null, { status: 204, headers: cors }),
  };
}
