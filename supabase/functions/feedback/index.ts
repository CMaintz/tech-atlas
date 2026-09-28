/**
 * `feedback` — the site's feedback form (A100). POST `{ category, message, email?,
 * page?, lang, website? }` -> `{ ok: true }`: stores the row in private.feedback (via
 * the service-role-only `feedback_submit`, which also rate-limits: 5 an hour per hashed
 * IP, 50 a day in total) and emails the owner through Resend. The handler lives in
 * logic.ts, unit-tested with a mocked fetch.
 *
 * Public and anonymous (deployed with --no-verify-jwt). CORS for the site and localhost,
 * body <= 16 KB, message <= 2,000 characters. Secret: RESEND_API_KEY (optional; set by
 * .github/workflows/backend.yml; without it rows are stored and no email is sent).
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
 */
import { floodFilter, handleFeedback } from "./logic.ts";

const limiter = floodFilter();

Deno.serve((req) =>
  handleFeedback(req, {
    fetch: (url, init) => fetch(url, init),
    env: (name) => Deno.env.get(name),
    limiter,
  })
);
