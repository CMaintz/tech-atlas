# Security model

How Atlas protects its secrets, its visitors and their data, and what the owner has to
switch on outside the code. Findings and their status: [design/SECURITY_REVIEW.md](../design/SECURITY_REVIEW.md).
Reporting a vulnerability: [SECURITY.md](../SECURITY.md). Decision: A89.

## What there is to protect

| Asset | Where it lives | Who may read it |
| --- | --- | --- |
| Supabase **access token** (controls the whole Supabase account) | GitHub secret `SUPABASE_ACCESS_TOKEN` | the `backend` workflow only |
| Supabase **database password** | GitHub secret `SUPABASE_DB_PASSWORD` | the `backend` workflow only |
| Supabase **secret / service_role key** (bypasses Row Level Security) | the platform; fetched at run time by `backend`, injected into the Edge Function | the function, the seeding step |
| **Cloudflare** account ID + Workers AI token | GitHub secrets; copied into the function's secrets | `backend`, the function |
| GitHub OAuth client secret | Supabase dashboard only | Supabase |
| Learner progress + sign-in email | Supabase (`learner_state`, `auth.users`), EU region | the learner (RLS) |
| **Public** values: project URL, anon/publishable key, function URL | repository **variables**, the browser bundle | everyone, by design |

The public values are safe to ship because Row Level Security, grants and the function's
own limits — not secrecy — protect the data.

## Secrets never reach the repository or the site

- **`mise run audit`** runs **gitleaks** (version pinned in `mise.toml`, config in
  `.gitleaks.toml`) over the **whole git history** on every PR and push, with extra rules
  for Supabase secret keys, access tokens and service_role JWTs. A finding fails the gate.
  The only allowlist entry is the per-term passage hashes in the vector files, by exact
  path and line shape.
- **The build refuses to ship a secret** (`app/integrations/dist-guard.mjs`): after every
  `astro build` — the gate's and the deploy's — it scans `dist/` for Supabase secret keys,
  access tokens, private keys, any JWT whose role isn't `anon`, and the value of any
  secret variable present in the build environment.
- `.env` / `.env.*` (except `.env.example`), `*.pem` and `*.key` are git-ignored
  everywhere. GitHub secret scanning and push protection are on for the repository.

If a scan finds a real secret: **rotate it first** (at Supabase / Cloudflare / GitHub),
then remove it from the code, then purge it from history. Purging without rotating
achieves nothing — the value is already public.

## CI/CD

- Every action is pinned to a commit SHA (Dependabot keeps the pins fresh); every tool
  is pinned to a version (`mise.toml`, the Supabase CLI in `backend.yml`).
- `permissions: contents: read` by default; only the Pages deploy job gets
  `pages: write` + `id-token: write`. Checkouts don't keep the token
  (`persist-credentials: false`).
- No `pull_request_target`; no event data (titles, branch names) is interpolated into
  a `run:` script. Pull requests run the gate without any secrets.
- `deploy` and `backend` run only after a **successful gate on a push to `main`** of
  this repository (`workflow_run`), on exactly that commit, or by a manual run **on
  `main`**. The Pages deploy is also bound to the `github-pages` environment (main only).
- In `backend`, each step receives only the secrets it uses. Checkout, tool installs and
  `npm ci` (third-party install scripts) see none; the seeding script runs without the
  Supabase access token.
- Dependabot waits 5 days before proposing a new release (most hijacked npm versions
  are pulled within that window); `mise run audit` also verifies npm registry signatures.

## The backend (Supabase)

- **`learner_state`**: RLS on; a signed-in user can select/insert/update/delete **only
  their own row** (`auth.uid() = user_id`); `anon` has no privileges at all. The server
  sets `version`, `updated_at` and the tombstone time (trigger, `search_path = ''`). Size
  and shape are capped by constraints. The only personal data is the sign-in email (in
  `auth.users`) and study progress.
- **`term_vectors`**: public content, read-only for `anon`/`authenticated`; written only
  by the service role (CI).
- **`search_allow`** (`security definer`, `search_path = ''`) is executable only by the
  service role; its counters live in the unexposed `private` schema, keyed by a
  truncated SHA-256 of the client IP — addresses are never stored or logged.
- **`semantic-search`** is public by design: CORS for the site and localhost only
  (CORS is not access control — the limits are), a 2 KB body cap counted while
  streaming, validated input, per-IP and global daily rate limits in Postgres, one
  upstream deadline, generic error messages, no IPs or secrets in logs, `no-store` and
  `nosniff` on every answer.
- **Auth**: OAuth providers (GitHub; LinkedIn when enabled, A87) and, when turned on, email magic links — all with **PKCE** — the returned code
  is useless without the verifier this browser generated. Redirects go only to URLs on
  Supabase's allowlist.

Checked live against the project with the public key (A89): `anon` is refused on
`learner_state` (select and insert), on inserting into `term_vectors` and on calling
`search_allow`; the `private` schema is not exposed.

## The site

- **Content-Security-Policy** in every page (a `<meta>` — GitHub Pages can't send
  headers), generated by Astro (`security.csp`, `app/integrations/csp.mjs`):
  `script-src 'self'` plus build-time hashes of Astro's inline loaders — no
  `'unsafe-inline'`, no `'unsafe-eval'`, so injected markup can't run script and
  `javascript:` links are dead. `connect-src` allows only the site and the configured
  Supabase project. `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`,
  `frame-src 'none'`. Styles allow `'unsafe-inline'` because Cytoscape and
  3d-force-graph inject `<style>` at run time and the legends use `style=""`; CSS
  cannot run script under this policy. The build fails if a page lacks the policy or
  carries an inline script the policy doesn't hash.
- **Not possible with a meta policy**: `frame-ancestors` (anti-framing), reporting.
  Instead, every page hides itself when loaded inside another site's frame.
- `<meta name="referrer" content="strict-origin-when-cross-origin">`: other sites see
  only the origin, never the page path.
- No HTML is built from strings at run time; the one `set:html` (JSON-LD) escapes `<`.
  Source links must be `http(s)` (schema). No `target="_blank"` links.

## Known limitation: the shared origin

The site is served from `https://cmaintz.github.io/tech-atlas/`. **Every** GitHub Pages
site of the `CMaintz` account shares the origin `https://cmaintz.github.io`, and the
browser gives all of them the same `localStorage`. Atlas keeps the Supabase session
(access + refresh token), the PKCE verifier and learner progress there. A script running
on _any_ other `cmaintz.github.io/*` site — through an XSS bug or a compromised
dependency there — could read them and act as the signed-in learner (read or overwrite
their progress, delete it). Atlas's CSP cannot prevent this; it only governs Atlas's own
pages.

Options, best first:

1. **A custom domain** (e.g. `atlas.<your-domain>`): the site gets its own origin and
   storage. Set it in **Settings → Pages → Custom domain** (add the CNAME record at your
   DNS provider, tick **Enforce HTTPS**), then update `site`/`base` in
   `app/astro.config.mjs`, the CORS origin in
   `supabase/functions/semantic-search/logic.ts`, and Supabase's Site URL + redirect
   allowlist. Putting Cloudflare (free) in front would also allow real response headers
   (`frame-ancestors`, `X-Content-Type-Options`, HSTS).
2. Publish from a separate GitHub organisation (`<org>.github.io`) that hosts nothing
   else — same effect, no domain needed.
3. Until then: keep every other `cmaintz.github.io` site free of third-party scripts
   and user-supplied HTML, and keep sessions short (**Supabase → Authentication →
   Sessions**: e.g. time-box sessions, and keep refresh-token reuse detection on).

The data at stake is study progress, not money or secrets, which is why this is
documented rather than blocking — but it is the first thing to fix before storing
anything more sensitive.

## Owner actions (repository settings and dashboards)

These can't be done from code. In order of value:

1. **Protect `main`** — **Settings → Rules → Rulesets → New branch ruleset**, target
   `main`: require a pull request, require the status check **`gate`**, block force
   pushes and deletions. (Today any push to `main` deploys.)
2. **Restrict the backend secrets to `main`** — the `backend` job now runs in the
   `backend` environment (created automatically on its first run, or create it now under
   **Settings → Environments → New environment**). Set **Deployment branches and tags →
   Selected branches → `main`**, then move `SUPABASE_ACCESS_TOKEN`,
   `SUPABASE_DB_PASSWORD`, `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` from
   **Repository secrets** into the environment's secrets and delete the repository-level
   copies. Only a job on `main` can then read them.
3. **Private vulnerability reporting** — **Settings → Security → Private vulnerability
   reporting → Enable** (SECURITY.md points reporters there).
4. **Require SHA-pinned actions** — **Settings → Actions → General → Require actions to
   be pinned to a full-length commit SHA** (every workflow already complies).
5. **Dependabot security updates** — **Settings → Security → Dependabot security
   updates → Enable**; also **Secret scanning → Non-provider patterns** on.
6. **Supabase → Authentication → URL Configuration**: the redirect allowlist should be
   exactly `https://cmaintz.github.io/tech-atlas/**` (plus `http://localhost:4321/**`
   only while developing sign-in locally — remove it otherwise).
7. **Supabase → Authentication**: keep "Confirm email" on; set up custom SMTP before
   inviting learners (docs/SUPABASE_SETUP.md step 4); review **Rate Limits** (emails per
   hour) so the sign-in form can't be used to spam addresses.
8. **Scope the Supabase access token** — it can administer every project in the
   account. If Supabase offers project-scoped tokens for your plan, use one; otherwise
   keep the Atlas project in an organisation of its own. Rotate it and the Cloudflare
   token yearly, or at once if a workflow log ever shows one.
9. After merging, check **Insights → Dependency graph → Dependabot** shows no config error (the new `cooldown` keys).
10. Optional: if nothing uses GraphQL, disable **pg_graphql** (Database → Extensions) to
   shrink the public API surface.
11. Longer term: the custom domain above.
