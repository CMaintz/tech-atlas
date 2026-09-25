# Security policy

Atlas is a cybersecurity dictionary; we'd rather hear about a weakness from you than
read about it somewhere else.

## Reporting a vulnerability

**Please don't open a public issue.** Report it privately through GitHub:

1. Go to <https://github.com/CMaintz/tech-atlas/security/advisories/new>
   (**Security** tab → **Report a vulnerability**).
2. Describe what you found, how to reproduce it, and what an attacker could do with it.

This is a one-person project, so we aim to reply within a week. We'll agree on a fix and a disclosure date with
you, and credit you in the advisory unless you'd rather not be named.

If the form isn't available, open an issue that says only "security contact wanted",
without details, and we'll get in touch.

## Scope

In scope:

- The site at <https://cmaintz.github.io/tech-atlas/> and the code in this repository.
- The Supabase backend it uses: sign-in, synced progress (`learner_state`) and the
  `semantic-search` Edge Function.
- The GitHub Actions workflows (`.github/workflows/`).

Out of scope: other sites under `cmaintz.github.io`, GitHub, Supabase and Cloudflare
themselves (report those to their owners), denial of service by volume, and findings
from automated scanners without a demonstrated impact.

Please don't access other people's data, send sign-in emails to addresses you don't
own, or run load tests against the backend.

## How Atlas is secured

See [docs/SECURITY.md](docs/SECURITY.md) for the security model and
[design/SECURITY_REVIEW.md](design/SECURITY_REVIEW.md) for the latest review.
