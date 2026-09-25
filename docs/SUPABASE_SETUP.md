# Turning on the backend: accounts, synced progress and search by meaning (Supabase)

Atlas works fully without this: learner progress lives in the browser and search matches
names and aliases. One Supabase project adds two optional features:

- **Accounts + synced progress** — sign-in (email magic link + GitHub) so a learner's
  progress follows them across devices (A44–A50 in `design/AUTONOMOUS_DECISIONS.md`):
  steps 1–6. Until both repository variables in step 5 are set, the site has no account UI.
- **Search by meaning** — questions like "how do I stop people reusing leaked passwords"
  find _Credential stuffing_, in English or Danish (A74–A77): steps 1, 2, 5 (the URL) and 7.
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
  (`20260923000000_learner_state.sql`, then `20260925000000_term_vectors.sql`), and
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

**Email (magic link)** — on by default (**Authentication → Sign In / Providers → Email**).
Leave "Confirm email" on.

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

They must be **variables**, not secrets — `deploy.yml` reads `vars.*`.

## 6. Deploy and check

1. **Actions → deploy → Run workflow** (or merge anything to `main`).
2. Open <https://cmaintz.github.io/tech-atlas/en/> — the header now shows **Sign in**.
3. Sign in with GitHub, answer a quiz question, then open the site in another browser,
   sign in there, and check **Study** shows the same progress.
4. In Supabase, **Table Editor → learner_state** shows one row per signed-in learner.

## 7. Search by meaning

How it fits together: `npm run embed` embeds every term offline into
`supabase/seed/term-vectors.json` (committed). On every push to `main`, the `backend`
workflow applies the migrations, deploys the `semantic-search` Edge Function and loads the
vectors into `public.term_vectors`. The site calls
`<PUBLIC_SUPABASE_URL>/functions/v1/semantic-search`; the function embeds the query with
**bge-m3 on Cloudflare Workers AI** (too large to run inside a Supabase Edge Function —
A74) and ranks terms in Postgres. If anything is missing or down, search quietly falls
back to names.

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

**7c. GitHub — CMaintz/tech-atlas → Settings → Secrets and variables → Actions.**

| Kind                         | Name                    | Value                                |
| ---------------------------- | ----------------------- | ------------------------------------ |
| **Variables** tab            | `SUPABASE_PROJECT_REF`  | the project ref                      |
| **Variables** tab (step 5)   | `PUBLIC_SUPABASE_URL`   | `https://<ref>.supabase.co`          |
| **Secrets** tab              | `SUPABASE_ACCESS_TOKEN` | the Supabase access token            |
| **Secrets** tab              | `SUPABASE_DB_PASSWORD`  | the database password                |
| **Secrets** tab              | `CLOUDFLARE_ACCOUNT_ID` | the Cloudflare account ID            |
| **Secrets** tab              | `CLOUDFLARE_API_TOKEN`  | the Cloudflare Workers AI token      |

Search by meaning needs only `PUBLIC_SUPABASE_URL` in the site build; accounts additionally
need `PUBLIC_SUPABASE_ANON_KEY` (step 5). Without `SUPABASE_PROJECT_REF` the `backend`
workflow is skipped; without the two Supabase secrets its steps are skipped with a notice;
without the two Cloudflare secrets it deploys everything but the function answers 503
(set them later here, or in Supabase under **Edge Functions → Secrets** as
`CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN`).

**7d. Deploy and check.**

1. **Actions → backend → Run workflow** (it also runs on every push to `main`). It should
   end with `term_vectors: <2 × number of terms> rows upserted, …`.
2. **Actions → deploy → Run workflow**, so the site is built with `PUBLIC_SUPABASE_URL`.
3. From a terminal:

   ```sh
   curl -s https://<ref>.supabase.co/functions/v1/semantic-search \
     -H 'Content-Type: application/json' \
     -d '{"q":"hvem har ansvaret for persondata","lang":"da","k":3}'
   ```

   → `{"hits":[{"id":"security/data-controller","score":0.6…},…]}`.
4. On the site, type `how do I stop people reusing leaked passwords`: _Credential
   stuffing_ appears, labelled **by meaning**.

The function is public (no key needed), accepts queries up to 200 characters and 30
requests a minute per IP, and answers CORS only for `https://cmaintz.github.io` and
`localhost`. Logs: **Edge Functions → semantic-search → Logs**.

**After editing terms:** run `npm run embed` in `app/` and commit the updated vector file
(the content lint fails on a new or removed term, warns on changed text). With
`CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` in your environment it uses Workers AI (a
few seconds); otherwise it runs the same model locally (~2.3 GB download once, then a few
minutes). The next push to `main` loads the vectors.

**Recommended once, after 7a:** run `npm run embed` with the two `CLOUDFLARE_*` values set
and commit the result. The vectors in the repository were computed locally from the same
bge-m3 weights; re-embedding on Workers AI makes terms and queries come from the identical
backend. If the curl in 7d.3 returns `{"error":"semantic search failed"}`, the function's
logs name the cause (e.g. a bad token, or an unexpected pooling from Workers AI).

## Local development

Copy `app/.env.example` to `app/.env` (git-ignored) and fill in the same two values;
`npm run dev` then includes the account UI, and search by meaning calls the deployed
function (its CORS allows `localhost`). Leave `.env` absent for the local-only site.

To run the function itself locally (needs Docker): `npx supabase start`, then
`npx supabase functions serve semantic-search --no-verify-jwt --env-file <file with the
two CLOUDFLARE_* values>`, and load vectors with `SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_KEY=<the local secret key from supabase start> npm run seed:vectors`.

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
- **Turning it off:** delete the two repository variables and redeploy (that also turns
  off search by meaning; deleting `SUPABASE_PROJECT_REF` stops the backend workflow).
