# Turning on accounts and synced progress (Supabase)

Atlas works fully without this: learner progress lives in the browser. These steps add
optional sign-in (email magic link + GitHub) so a learner's progress follows them across
devices (decisions A44–A50 in `design/AUTONOMOUS_DECISIONS.md`). Until both repository
variables in step 5 are set, the deployed site has no account UI at all.

Everything below is on free tiers. Roughly 15 minutes.

## 1. Create the Supabase project

1. Sign in at <https://supabase.com/dashboard> and choose **New project**.
2. Name it (e.g. `tech-atlas`), set a database password (store it in a password manager;
   the site never needs it), pick the region nearest your learners (e.g. _Central EU
   (Frankfurt)_), plan **Free**.
3. Wait for it to finish provisioning.

## 2. Create the table (run the migration)

Either:

- **Dashboard:** open **SQL Editor → New query**, paste the whole of
  [`supabase/migrations/20260923000000_learner_state.sql`](../supabase/migrations/20260923000000_learner_state.sql),
  and **Run**. It is idempotent, so running it twice is harmless.
- **CLI:** from the repo root, `npx supabase login`, `npx supabase link --project-ref <ref>`,
  then `npx supabase db push`.

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

## Local development

Copy `app/.env.example` to `app/.env` (git-ignored) and fill in the same two values;
`npm run dev` then includes the account UI. Leave `.env` absent for the local-only site.

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
- **Turning it off:** delete the two repository variables and redeploy.
