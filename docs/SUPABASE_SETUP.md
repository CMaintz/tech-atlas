# Turning on the backend: accounts, synced progress and search by meaning (Supabase)

Atlas works fully without this: learner progress lives in the browser and search matches
names and aliases. One Supabase project adds two optional features:

- **Accounts + synced progress** — sign-in (GitHub, optionally LinkedIn) so a learner's
  progress follows them across devices (A44–A50 in `design/AUTONOMOUS_DECISIONS.md`):
  steps 1–6. Until both repository variables in step 5 are set, the site has no account UI.
- **Search by meaning** — questions like "how do I stop people reusing leaked passwords"
  find _Credential stuffing_, in English or Danish (A75–A78): steps 1, 2 and 7.
  The language model runs on the backend; visitors download nothing.

Everything below is on free tiers. Roughly 15 minutes per feature.

## 1. Create the Supabase project

1. Sign in at <https://supabase.com/dashboard> and choose **New project**.
2. Name it (e.g. `tech-atlas`), set a database password (store it in a password manager;
   the site never needs it, but CI does — step 7), plan **Free**, and pick an **EU
   region — recommended: _Central EU (Frankfurt)_** (`eu-central-1`). Learners are in
   Denmark, and account data (emails, progress) then stays in the EU under GDPR; it is
   also the lowest latency for search. The region cannot be changed later.
3. Wait for it to finish provisioning.

## 2. Create the tables (run the migrations)

If you set up step 7, the `backend` workflow runs every migration for you
(`supabase db push`) — skip to the check. Otherwise either:

- **Dashboard:** open **SQL Editor → New query**, paste the whole of each file in
  [`supabase/migrations/`](../supabase/migrations/) in name order
  (`20260923000000_learner_state.sql`, `20260925000000_term_vectors.sql`, then
  `20260926000000_search_rate_retention.sql`), and
  **Run**. They are idempotent, so running one twice is harmless — including when the
  workflow later applies them again.
- **CLI:** from the repo root, `npx supabase login`, `npx supabase link --project-ref <ref>`,
  then `npx supabase db push`.

The second migration **enables pgvector** itself
(`create extension if not exists vector with schema extensions`). To do it by hand
instead: **Database → Extensions**, search `vector`, enable it in schema `extensions`.

Check: **Table Editor → learner_state** exists (columns `user_id`, `state`, `version`,
`updated_at`, `deleted_at`) and shows **RLS enabled** with four policies
(read / insert / update / delete own).

## 3. Auth URLs

**Authentication → URL Configuration:**

- **Site URL:** `https://cmaintz.github.io/tech-atlas/`
- **Redirect URLs** — add:
  - `https://cmaintz.github.io/tech-atlas/**`
  - `http://localhost:4321/**` (only if you want to try sign-in with `npm run dev`)

Sign-in links and the GitHub flow return to `/tech-atlas/en/account/` or
`/tech-atlas/da/account/`; the wildcard covers both.

## 4. Sign-in providers

**Email (magic link)** — **hidden on the site for now** (A87): the account page shows no
email field until `EMAIL_SIGNIN` in `app/src/lib/auth-config.ts` is set to `true` (one
line). Do that only once custom SMTP (below) works. In Supabase it is on by default
(**Authentication → Sign In / Providers → Email**); leave "Confirm email" on.

> Supabase's built-in mailer is for testing: it sends only a few emails an hour, and only
> to members of your Supabase organisation. For other learners to receive sign-in links,
> set up custom SMTP (**Authentication → Emails → SMTP Settings**) with any provider that
> has a free tier (e.g. Resend, Brevo), sending from a domain you own.

**GitHub:**

1. On GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App**.
   - Application name: `Atlas`
   - Homepage URL: `https://cmaintz.github.io/tech-atlas/`
   - Authorization callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`
     (copy the exact value shown in Supabase's GitHub provider panel).
2. Register, then **Generate a new client secret**.
3. In Supabase: **Authentication → Sign In / Providers → GitHub** → enable, paste the
   Client ID and Client Secret, save.

The GitHub client secret lives only in Supabase — never in this repository or its
variables.

**LinkedIn (optional)** — Supabase's provider is **LinkedIn (OIDC)** (`linkedin_oidc`); the
older plain "LinkedIn" provider is deprecated, don't use it.

1. LinkedIn requires every developer app to be associated with a **LinkedIn Company
   Page**, and you must be an admin of that page. If you don't have one: on LinkedIn,
   **For Business → Create a Company Page** — a simple page named e.g. `Atlas` is enough.
2. Go to <https://www.linkedin.com/developers/apps> → **Create app**:
   - App name: `Atlas`
   - LinkedIn Page: the Company Page from step 1
   - Privacy policy URL: `https://cmaintz.github.io/tech-atlas/en/privacy/`
   - App logo: any square image (required)
   - Accept the terms → **Create app**. If asked, verify the app (**Settings** tab →
     **Verify** → open the link as the page admin and approve it).
3. **Products** tab → **Sign In with LinkedIn using OpenID Connect** → **Request access**
   (granted at once). It provides the `openid`, `profile` and `email` scopes Supabase uses.
4. **Auth** tab → **OAuth 2.0 settings → Authorized redirect URLs for your app** → add
   `https://<project-ref>.supabase.co/auth/v1/callback` (copy the exact value shown in
   Supabase's LinkedIn (OIDC) panel). On the same tab, copy the **Client ID** and the
   **Primary Client Secret**.
5. In Supabase: **Authentication → Sign In / Providers → LinkedIn (OIDC)** → enable,
   paste the Client ID and Client Secret, save.
6. Show the button: set the repository variable `PUBLIC_AUTH_PROVIDERS` to
   `github,linkedin_oidc` (step 5) and redeploy.

Which buttons the site shows is decided by `PUBLIC_AUTH_PROVIDERS` alone
(comma-separated; unknown names are ignored; unset = `github`), so enabling a provider in
Supabase changes nothing on the site until it is listed there — no half-configured button
is ever shown.

## 5. Give the site the two public values

In Supabase, **Project Settings → API Keys** (and **Data API** for the URL), copy:

- the **Project URL**, e.g. `https://abcdefghijklmnop.supabase.co`
- the **publishable key** (`sb_publishable_…`), or the legacy **anon** key — either works.

These are public by design: they ship in the browser bundle, and Row Level Security is
what protects the data. **Never** use the `service_role` / secret key here.

In GitHub: **CMaintz/tech-atlas → Settings → Secrets and variables → Actions →
Variables** tab → **New repository variable**, twice:

| Name                       | Value                      |
| -------------------------- | -------------------------- |
| `PUBLIC_SUPABASE_URL`      | the Project URL            |
| `PUBLIC_SUPABASE_ANON_KEY` | the publishable / anon key |

Optionally a third, once LinkedIn is set up (step 4): `PUBLIC_AUTH_PROVIDERS` =
`github,linkedin_oidc`. Unset means GitHub only.

They must be **variables**, not secrets — `deploy.yml` reads `vars.*`.

## 6. Deploy and check

1. **Actions → deploy → Run workflow** (or merge anything to `main`).
2. Open <https://cmaintz.github.io/tech-atlas/en/> — the header now shows **Sign in**.
3. Sign in with GitHub, answer a quiz question, then open the site in another browser,
   sign in there, and check **Study** shows the same progress.
4. In Supabase, **Table Editor → learner_state** shows one row per signed-in learner.

## 7. Search by meaning

How it fits together: after every push to `main` that passes the gate, the `backend`
workflow applies the migrations, deploys the `semantic-search` Edge Function, **embeds every
term through Cloudflare Workers AI** (bge-m3 — too large to run inside a Supabase Edge
Function, A75) into `public.term_vectors`, and finally runs a **smoke test** that fails the
workflow unless three known questions (one Danish, two English) find their terms. The site
calls the function; the function embeds the query with the very same Workers AI call and
ranks terms in Postgres. Stored and query vectors therefore always come from one service.
If anything is missing or down, search quietly falls back to names.

**7a. Cloudflare (runs the model; free tier: 10,000 neurons/day — a query costs ~0.02).**

1. Sign up / sign in at <https://dash.cloudflare.com> (the free Workers plan is enough).
2. **Account ID:** on **Account home → Workers & Pages** (or any zone's overview) the right
   sidebar shows _Account ID_ — copy it.
3. **API token:** **My Profile → API Tokens → Create Token →** the **Workers AI** template
   (or a custom token with _Account · Workers AI · Read_), scoped to this account only →
   create, copy the token (shown once).

**7b. Supabase values for CI.**

1. **Project ref:** the `abcdefghijklmnop` in `https://abcdefghijklmnop.supabase.co`
   (also **Project Settings → General → Project ID**).
2. **Access token:** <https://supabase.com/dashboard/account/tokens> → **Generate new
   token** (name it `tech-atlas CI`), copy it.
3. **Database password:** the one from step 1 (lost it? **Project Settings → Database →
   Reset database password**).
4. **Legacy API keys must stay enabled** (**Project Settings → API Keys → Legacy API
   Keys**, on by default). The function reads the platform-injected `SUPABASE_ANON_KEY`
   (to rank terms under Row Level Security) and `SUPABASE_SERVICE_ROLE_KEY` (for the rate
   limiter); both are the legacy keys. If you disable them, search by meaning answers
   `semantic search failed` and the site falls back to names.

**7c. GitHub — CMaintz/tech-atlas → Settings → Secrets and variables → Actions.**

| Kind              | Name                         | Value                                                    |
| ----------------- | ---------------------------- | -------------------------------------------------------- |
| **Variables** tab | `SUPABASE_PROJECT_REF`       | the project ref                                          |
| **Variables** tab | `PUBLIC_SEMANTIC_SEARCH_URL` | `https://<ref>.supabase.co/functions/v1/semantic-search` |
| **Secrets** tab   | `SUPABASE_ACCESS_TOKEN`      | the Supabase access token                                |
| **Secrets** tab   | `SUPABASE_DB_PASSWORD`       | the database password                                    |
| **Secrets** tab   | `CLOUDFLARE_ACCOUNT_ID`      | the Cloudflare account ID                                |
| **Secrets** tab   | `CLOUDFLARE_API_TOKEN`       | the Cloudflare Workers AI token                          |

`PUBLIC_SEMANTIC_SEARCH_URL` is what turns search by meaning on in the site build — it is
separate from `PUBLIC_SUPABASE_URL` (step 5), so a site with only accounts configured never
calls a function that isn't deployed. Set it **after** 7d.1 has passed.

The Cloudflare values must be **GitHub secrets** (the workflow copies them into the
function and uses them to embed the terms); setting them only in the Supabase dashboard is
not enough. Without `SUPABASE_PROJECT_REF` the `backend` workflow is skipped; without the
two Supabase secrets its steps are skipped with a notice; without the two Cloudflare
secrets it applies the migrations only and leaves search by meaning undeployed.

**7d. Deploy and check.**

1. **Actions → backend → Run workflow** on `main` (manual runs on other branches are
   ignored). Afterwards it runs by itself once the gate passes on each push to `main`. It
   should log `term_vectors: <2 × number of terms> rows upserted, …` and then three
   `ok` smoke lines; if a smoke query misses, the job fails.
2. Set `PUBLIC_SEMANTIC_SEARCH_URL` (7c), then **Actions → deploy → Run workflow**.
3. Optionally, from a terminal:

   ```sh
   curl -s https://<ref>.supabase.co/functions/v1/semantic-search \
     -H 'Content-Type: application/json' \
     -d '{"q":"hvem har ansvaret for persondata","lang":"da","k":3}'
   ```

   → `{"hits":[{"id":"security/data-controller","score":0.6…},…]}`.
4. On the site, type `how do I stop people reusing leaked passwords`: _Credential
   stuffing_ appears, labelled **by meaning**.

**Limits and budget (A77).** The function is public (no key needed). It reads at most
2 KB of request body, accepts queries up to 200 characters, and — in Postgres, shared by
every instance — allows **30 searches a minute per client** (keyed by a hash of the IP,
never the address) and **50,000 a day in total**, answering 429 beyond that. CORS answers
only `https://cmaintz.github.io` and `localhost`. The binding free-tier budget is
**Supabase Edge Function invocations: 500,000 a month**; Workers AI's 10,000 neurons a day
cover far more queries than the daily cap allows. To change the caps, edit
`public.search_allow` in a new migration. **Retention (A88):** expired counters are
deleted on every search and by a pg_cron job (`atlas-search-rate-purge`, every 10 minutes;
the migration enables **pg_cron** itself), so a per-client row (a hash of an IP address)
is gone within ~12 minutes and the daily total (no identifier) after 2 days — the privacy
page promises this. Check: **Integrations → Cron**, or `select * from cron.job;`. Logs: **Edge Functions → semantic-search → Logs**
(the first request per instance also logs the pooling Workers AI reports).

**After editing terms:** run `npm run embed` in `app/` and commit the updated vector file
(the content lint fails on a new or removed term, warns on changed text). That file only
feeds the lint's per-term hashes and the offline ranking tests — the database is always
re-embedded through Workers AI by the workflow. With `CLOUDFLARE_ACCOUNT_ID` +
`CLOUDFLARE_API_TOKEN` in your environment `npm run embed` uses Workers AI (seconds);
otherwise it runs the same model locally (~2.3 GB download once, then a few minutes).

## Local development

Copy `app/.env.example` to `app/.env` (git-ignored) and fill in the values you want;
`npm run dev` then includes the account UI and/or search by meaning (which calls the
deployed function; its CORS allows `localhost`). Leave `.env` absent for the local-only
site.

To run the function itself locally (needs Docker): `npx supabase start`, then
`npx supabase functions serve semantic-search --no-verify-jwt --env-file <file with the
two CLOUDFLARE_* values>`, and load vectors with `SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_KEY=<the local secret key from supabase start> CLOUDFLARE_ACCOUNT_ID=…
CLOUDFLARE_API_TOKEN=… npm run seed:vectors`.

## Good to know

- **Free-tier pause:** Supabase pauses free projects after a week without traffic. The
  site keeps working (progress stays local; sync shows "could not sync"); restore the
  project from the dashboard.
- **Deleting data:** the account page's "Delete my synced data" empties the learner's row
  and marks it deleted (a tombstone, so another signed-in device can't write progress
  back), then revokes their sessions; other devices sign out at their next sync. The
  sign-in identity itself (email / GitHub id in **Authentication → Users**) remains
  until you delete it there; deleting a user also deletes their row
  (`on delete cascade`).
- **Account deletion requests** (the privacy page tells learners to email
  cmaintz@outlook.com): **Authentication → Users** → find the user → **Delete user** (this
  also deletes their `learner_state` row), then in the SQL editor
  `delete from auth.audit_log_entries where payload->>'actor_id' = '<user id>';` to remove
  their sign-in log. Answer within a month (GDPR Art. 12).
- **Turning it off:** delete the two `PUBLIC_SUPABASE_*` repository variables and redeploy
  (accounts); delete `PUBLIC_SEMANTIC_SEARCH_URL` and redeploy (search by meaning); delete
  `SUPABASE_PROJECT_REF` to stop the backend workflow.
