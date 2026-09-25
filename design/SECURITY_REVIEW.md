# Security review — 2026-09-25

Scope: the whole repository and its full git history, the built site (`app/dist`), the
GitHub Actions workflows and repository settings, the Supabase backend (checked live
with the public key) and the `semantic-search` Edge Function (checked live). Branch
`chore/security-hardening`; decision A89. The model the fixes add up to is described in
[docs/SECURITY.md](../docs/SECURITY.md).

Severity is for this project as it stands: a public dictionary whose only personal data
is a sign-in email and study progress, and whose valuable secrets are the CI deploy
credentials.

**Summary:** no leaked secret anywhere in history or in the built site; the database
policies hold. The serious gaps were in CI (deploy credentials exposed to every step,
including third-party install scripts), in the missing CSP and secret scanning, and in
repository settings (unprotected `main`, repo-wide secrets). Everything fixable in code
is fixed; 11 owner actions remain.

## Findings

| # | Finding | Severity | Status | File(s) |
| --- | --- | --- | --- | --- |
| F1 | `backend.yml` put the Supabase **access token** (full account control), DB password and Cloudflare token in **job-level `env`**, so every step saw them — the checkout, the tool-install actions and `npm ci`, i.e. the install scripts of ~600 third-party packages. One compromised dependency could have exfiltrated the account token. The seeding script (npm dependencies at run time) also ran with the access token. | High | **Fixed**: secrets are step-scoped to the four steps that use them; `npm ci` sees none; seeding runs with `env -u SUPABASE_ACCESS_TOKEN`. | `.github/workflows/backend.yml` |
| F2 | Deploy secrets are **repository-wide**: any workflow run on any branch by someone with write access (or a stolen token) can read them. | Medium | **Partly fixed**: the job now runs in a `backend` environment. **Owner**: restrict it to `main` and move the four secrets into it (docs/SECURITY.md, owner action 2). | `.github/workflows/backend.yml` |
| F3 | **`main` is unprotected** (no ruleset, no required checks); a push to `main` deploys the site and the backend. | Medium | **Owner** (action 1). | repository settings |
| F4 | **No secret scanning in the gate.** GitHub push protection is on, but nothing in CI scanned history or knew the Supabase service_role JWT / `sb_secret_` shapes, and nothing checked the built bundle. | Medium | **Fixed**: gitleaks 8.30.1 (pinned in `mise.toml`, installed by the SHA-pinned mise action) scans the full history in `mise run audit` with Supabase-specific rules; `dist-guard` fails any build that ships a secret key, access token, private key, non-`anon` JWT or a secret env value. | `mise.toml`, `.gitleaks.toml`, `app/integrations/dist-guard.mjs` |
| F5 | **No Content-Security-Policy.** Any HTML injection (or a compromised client dependency injecting markup) could run script and read the Supabase session from `localStorage`. | Medium | **Fixed**: CSP meta on every page via Astro `security.csp` — `script-src 'self'` + build-time hashes, no `unsafe-inline`/`unsafe-eval`; `connect-src` only self + the Supabase project; `object-src 'none'`, `base-uri`, `form-action`, `frame-src 'none'`. The build fails on an uncovered inline script. Verified in headless Edge with zero violations. | `app/astro.config.mjs`, `app/integrations/csp.mjs` |
| F6 | **Shared origin**: `cmaintz.github.io` is shared by all the owner's Pages sites, which can read Atlas's `localStorage` — the Supabase access + refresh token, the PKCE verifier and progress. | Medium | **Owner**: custom domain (or a dedicated org) — options in docs/SECURITY.md. Cannot be fixed in this repo. | — |
| F7 | `actions/checkout` persisted the `GITHUB_TOKEN` in `.git/config` for later steps (`npm ci`, build scripts). Read-only token, but needless exposure. | Low | **Fixed**: `persist-credentials: false` in all three workflows. | `.github/workflows/*.yml` |
| F8 | `deploy.yml` accepted a manual run **from any branch** for the build job (only the `github-pages` environment stopped the deploy); `workflow_run` jobs didn't check the triggering run came from this repository. | Low | **Fixed**: manual runs on `main` only; `head_repository` must be this repository (both workflows). | `.github/workflows/deploy.yml`, `backend.yml` |
| F9 | The root `.gitignore` didn't ignore `.env` files outside `app/`, while the setup guide has the owner write the Cloudflare token into an env file for `supabase functions serve`. | Low | **Fixed**: `.env`, `.env.*` (except `.env.example`), `*.pem`, `*.key` ignored everywhere. | `.gitignore` |
| F10 | Term source URLs were validated with Zod `.url()`, which accepts `javascript:` and `data:` URLs — a content PR could have added a script link (the CSP now blocks it too). | Low | **Fixed**: `http(s)` only; tested. | `app/src/schema.ts` |
| F11 | **Clickjacking**: Pages can't send `frame-ancestors` / `X-Frame-Options`, and a meta CSP ignores `frame-ancestors`; the account page (sign out, delete synced data) could be framed. | Low | **Mitigated**: every page hides itself inside a foreign frame (verified); "delete" also needs a confirm dialog. Real fix needs headers (custom domain + CDN). | `app/src/layouts/Base.astro` |
| F12 | **Private vulnerability reporting** off, no `SECURITY.md`. | Low | **Fixed** (SECURITY.md) + **Owner** (enable reporting, action 3). | `SECURITY.md` |
| F13 | Dependabot proposed releases the day they were published (supply-chain window); Dependabot **security updates** are off. | Low | **Fixed**: 5-day cooldown; `mise run audit` also runs `npm audit signatures`. **Owner**: enable security updates (action 5). | `.github/dependabot.yml`, `mise.toml` |
| F14 | "Require actions pinned to a SHA" is off at repository level (all actions are pinned today, nothing enforces it). | Low | **Owner** (action 4). | repository settings |
| F15 | The Supabase access token can administer every project in the account. | Low | **Owner** (action 8): isolate/rotate. | — |
| F16 | Defence in depth on grants: the trigger function `learner_state_touch` kept Supabase's default EXECUTE for `anon`/`authenticated` (not callable via the API, verified); `private.search_rate` had no RLS (schema not exposed, verified). | Info | **Fixed**: new migration revokes and enables RLS (applied by `backend` after merge; `search_allow` is `security definer`, so the table owner bypasses RLS — the smoke test would catch a break). | `supabase/migrations/20260926000100_security_hardening.sql` |
| F17 | Edge Function answers lacked `nosniff` / `no-store`. | Info | **Fixed** (deployed by `backend` after merge). | `supabase/functions/semantic-search/index.ts` |
| F18 | The account page shows the `error_description` from the redirect URL. It is rendered as text (Preact escapes it), so a crafted link can show misleading words after "Sign-in failed:", nothing more. | Info | Accepted. | `app/src/components/Account.tsx` |
| F19 | `pg_graphql` is exposed (`graphql_public`); it sees only what the grants allow (`term_vectors`). | Info | **Owner**, optional (action 9). | Supabase |
| F20 | The Supabase redirect allowlist, email rate limits and SMTP can't be read with the public key. | Info | **Owner** to confirm (actions 6, 7). | Supabase dashboard |

## Verified, no change needed

- **Secrets in history**: gitleaks 8.30.1 over all 82 commits (all refs): 7 hits, all
  `generic-api-key` on 16-hex **passage hashes** keyed by term ids containing
  "api"/"token"/"auth" (`supabase/seed/term-vectors.json`, and in history
  `app/public/semantic/vectors.json`). False positives; allowlisted by exact path + line
  shape. The custom rules were checked against synthetic service_role JWTs (all three
  base64 alignments), `sbp_` and `sb_secret_` values.
- **Built site**: the only credential in `dist/` is the legacy **anon** JWT (role
  `anon`), plus the project URL and the function URL. The `sb_secret_` text in
  `account.*.js` is supabase-js's own key-prefix check, not a key.
- **RLS and grants, live** (public key): `learner_state` select/insert → `permission
  denied`; `term_vectors` select works, insert → `permission denied`; `rpc/search_allow`
  → `permission denied`; `rpc/learner_state_touch` → not found; `private` schema →
  not exposed; the OpenAPI schema requires the service role. Both `security definer` /
  trigger functions pin `search_path = ''`; `match_terms` is `security invoker`.
- **Edge Function, live**: a foreign `Origin` gets no `Access-Control-Allow-Origin`; bad
  `lang`, non-JSON body and `GET` get short generic errors; no stack traces, keys or
  upstream messages are returned; logs hold error messages only, never IPs (the rate
  limiter stores a truncated SHA-256).
- **Auth**: PKCE for both flows (`flowType: 'pkce'`), email confirmation on, only GitHub
  + email enabled, anonymous sign-in off (live `/auth/v1/settings`). Redirect targets
  are fixed paths on `location.origin`, never taken from the URL.
- **Front-end sinks**: no `innerHTML` writes of data (one clears a container), no
  `dangerouslySetInnerHTML`/`eval`/`new Function`; the JSON-LD `set:html` escapes `<`;
  the timeline's `set:html` style is generated from domain ids at build time; no
  `target="_blank"`; no open redirects (`location.href` targets are built from the base
  path and graph ids).
- **Workflows**: every action SHA-pinned; tools version-pinned; no
  `pull_request_target`; no `github.event.*` text interpolated into `run:`;
  `add-mask` before any use of the fetched secret key; default workflow token
  read-only; `workflow_run` only from a successful `push` gate on `main`.
- **Dependencies**: `npm audit` 0 vulnerabilities; lockfile v3, every package from
  `registry.npmjs.org` with an `integrity` hash; `npm audit signatures`: registry
  signatures verified. Dependabot covers npm and actions weekly.
- **Repository**: GitHub secret scanning and push protection on; default workflow
  permissions read-only; `github-pages` environment limited to `main`; HTTPS enforced.

## How the CSP was verified

Built with the production `PUBLIC_*` values, served with `astro preview`, and driven by
headless Edge over the DevTools protocol, listening for `securitypolicyviolation`
events, CSP issues and console errors: home (including a natural-language search that
called the function and rendered "by meaning" results), a term page, the timeline, the
Explorer in 2D and in 3D (WebGL), and the account page (the GitHub button navigated to
Supabase's authorize endpoint and on to GitHub's login). Result: no violations, no
console errors, no exceptions; the only third-party host contacted was the Supabase
project. The negative test proves the policy is live: a script injected into the DOM did
not run, and an image, a fetch and an iframe to another origin were each blocked
(`script-src-elem`, `img-src`, `connect-src`, `frame-src`). Loaded in an `<iframe>` on
another page, the site set itself to `display: none`.
