# Changelog

Atlas follows [semantic versioning](https://semver.org) with beta pre-releases
(v2.0.0-beta.1, beta.2, ... then v2.0.0 at launch). New entries are written by
release-please from conventional commits; see README "Releasing".

## [2.0.0-beta.1](https://github.com/CMaintz/tech-atlas/compare/v1.0.0...v2.0.0-beta.1) (2026-10-02)


### Features

* **about:** add maintz.dev link ([39f5d0d](https://github.com/CMaintz/tech-atlas/commit/39f5d0ddfbff80c711fcdc3314ea78d0d1802382))
* **about:** link the owner's website maintz.dev ([922cc93](https://github.com/CMaintz/tech-atlas/commit/922cc939aa2967b37f49a3563d4b41d243cb7c71))
* **feedback:** feedback form that emails the owner (A100) ([5b89739](https://github.com/CMaintz/tech-atlas/commit/5b89739d4051185e02d2b83281e76de5d0efbd13))
* **feedback:** feedback form that emails the owner (A100) ([67863ef](https://github.com/CMaintz/tech-atlas/commit/67863ef6909b16f828b56ec3245b437bbabe4d4b))
* **release:** semver beta releases with release-please; version in the footer (A99) ([f97d92a](https://github.com/CMaintz/tech-atlas/commit/f97d92ab7149b36229b368788d5d04fd15df3db1))
* **site:** show the version in the footer and About dialog ([29b4988](https://github.com/CMaintz/tech-atlas/commit/29b4988f22f4890a36eb86f3f5bd04fccf281fe4))
* **terms:** how to put it into practice on actionable terms ([e2001af](https://github.com/CMaintz/tech-atlas/commit/e2001aff401d0bd58f02ffb7269d0e9b0e69ae0c))
* **terms:** howTo for the actionable AI terms ([ce5b073](https://github.com/CMaintz/tech-atlas/commit/ce5b073aa1a98fe3bb14498f0cbad6222cd6a52b))
* **terms:** howTo for the actionable AI terms ([40627ec](https://github.com/CMaintz/tech-atlas/commit/40627ec9e0cf37d9a03ebeb516dfbc96bf95892d))
* **terms:** howTo for the actionable platform and cs terms ([5209e3b](https://github.com/CMaintz/tech-atlas/commit/5209e3baf71d3f201a9fcca830a366d425c4ce81))
* **terms:** howTo for the actionable platform and cs terms ([19a469d](https://github.com/CMaintz/tech-atlas/commit/19a469d3e7cc278f5e59bbb6d2bc5ac2a80ec593))
* **terms:** howTo for the remaining 42 actionable security terms ([d54d9cf](https://github.com/CMaintz/tech-atlas/commit/d54d9cff27cdf2b060f876fcc31cb433f829c93d))
* **terms:** howTo for the remaining actionable security terms ([506db0e](https://github.com/CMaintz/tech-atlas/commit/506db0eb340ea3c4332ebc691c629154de8d2b78))


### Fixes

* **explorer:** legend pill bottom-left, opening upward; bar uses full width ([5fdd0f3](https://github.com/CMaintz/tech-atlas/commit/5fdd0f3f639c24e2f372ddd1973f94615acad172))
* **explorer:** legend pill bottom-left, opening upward; bar uses full width ([fc44015](https://github.com/CMaintz/tech-atlas/commit/fc440150e9a05ff2a09b874423ae387ed7b7fe56))
* **explorer:** selection wins over hover, no hover while moving, relationship names on lit links ([18c3749](https://github.com/CMaintz/tech-atlas/commit/18c37494e24eb0f98528e683530f2b027724ac11))
* **explorer:** selection wins over hover, no hover while the map moves; name lit links ([3f6624b](https://github.com/CMaintz/tech-atlas/commit/3f6624b540bacde5b03bbaa9664c38160187281b))
* **feedback:** name stored feedback under Supabase; split the purge job ([373a97d](https://github.com/CMaintz/tech-atlas/commit/373a97dfcb62019a868851527db7720e6f52ea69))
* **lint:** count size-check lines from the parsed tree ([65564e5](https://github.com/CMaintz/tech-atlas/commit/65564e52eb5226006feaa4561f0746a109ad32b6))
* **lint:** size-check skips doc comments attached to the tree ([c4654c4](https://github.com/CMaintz/tech-atlas/commit/c4654c47854459a3332e2428a8f4765a864e31ce))
* **supabase:** guard pg_cron create in feedback migration ([a3edf51](https://github.com/CMaintz/tech-atlas/commit/a3edf515973a2c02bfa83774135f284b3b914e40))
* **supabase:** guard pg_cron create in feedback migration ([1b674d3](https://github.com/CMaintz/tech-atlas/commit/1b674d332b57327fe6117924db01c5a789f25787))


### Documentation

* **account:** account-rows.ts also talks to Supabase ([32d0be9](https://github.com/CMaintz/tech-atlas/commit/32d0be94ade57260f10adb3e4c6485b9ad4cc765))
* **decisions:** A99 selection wins over hover, relationship names ([3d073a6](https://github.com/CMaintz/tech-atlas/commit/3d073a62d4a99e193d83152eddbd52767d1c3414))
* **decisions:** renumber A99 to A97a (A99 is claimed by [#72](https://github.com/CMaintz/tech-atlas/issues/72)) ([e54b4ce](https://github.com/CMaintz/tech-atlas/commit/e54b4ce0e4172478c2197a481828e10b390298dd))
* drop the A93b decision-log note (decision logs are local-only now) ([196fc7b](https://github.com/CMaintz/tech-atlas/commit/196fc7b70b0305ea7179c33f22ac2058584fd872))
* **media:** re-record the Explorer GIF ([a30891a](https://github.com/CMaintz/tech-atlas/commit/a30891a65d79e24e6901987dd7efedb9579ca0ff))
* **media:** re-record the Explorer GIF from current main ([388e7ce](https://github.com/CMaintz/tech-atlas/commit/388e7ce584ced02ad0a2c0a1d79d30b0389e6263))

## v1.0.0 to v2.0.0-beta.1: summary

Written by hand. Atlas changed from a searchable dictionary into a bilingual map for
learning; everything below landed after v1.0.0 (PRs #2 to #70).

### Content

- Over 430 terms across security, computer science, AI and platforms, up from the v1
  seed: batch 3 (150 terms), AI and platform domains, batch 5 (appsec, detection and
  response, identity, EU/DK regulation), batch 6, full course-compendium coverage and
  an AI dictionary of 104 terms, plus 16 new machine-learning terms after a web-verified
  review.
- Long-form articles (EN + DA), era years for the timeline, an extended technical deep
  dive with sources for every term, and a prose refinement pass over all terms and
  articles.
- Auto-linked prose, mentions, disambiguation pages and search intents.

### Explorer

- A 2D and 3D graph explorer with depth axis, routes between terms and learn-first
  paths; the Time layout and a swim-lane timeline.
- Domain colour families, flowing directed edges, a stable backbone overview with
  lanes and 3D galaxies, and the relationship types that carry structure shown by
  default.
- A term side panel with in-place expand, previous/next through connections and
  history.
- A floating control bar (responsive, never two rows), a collapsible legend, hover
  cards, drag feedback, WASD keyboard navigation and named 3D galaxies.
- A hidden visual lab to compare old and new effects with a frame meter.

### Search

- Static semantic search across English and Danish, later moved to a backend
  (Supabase pgvector and an Edge Function) with looser deadlines.
- "Find a term" in the Explorer matches by name and by meaning, like the home search.

### Learning

- A study layer: generated quizzes, spaced repetition and a personal knowledge map.
- A hand-written question bank (180 questions), domain quizzes, questions never
  answered by their own page, and a review queue.
- A guided tour with eased motion.

### Accounts and privacy

- Optional sign-in with synced learner progress (Supabase), sign-in first, with
  LinkedIn (OIDC); email sign-in hidden.
- A privacy page. Atlas is free forever: no ads, no paywall, no tracking.

### Security

- Secret scanning, a Content Security Policy, least-privilege CI and a security review.
- Dependabot for npm and GitHub Actions, with a cooldown and grouped updates.

### Design

- A home page, mobile navigation and a UX baseline; a complete light theme with a
  cream map; a language menu; a BETA ribbon (a badge on phones).
- A mobile pass: 44px tap targets, dynamic viewport units, safe areas and 16px inputs.
- An About dialog with credits; no em or en dashes in anything a reader sees.
- Open data (JSON, CSV, Anki, graph), RSS feeds, SEO, a 404 page, an A-Z index and
  short URLs.

### Docs and CI

- The Foundry gate (lint, typecheck, tests with a full build, audit) on every PR, and
  a deploy that ships only what passed the gate.
- A README with a demo GIF and screenshots, a content licence (CC BY-SA 4.0) and
  regular reviews of the decision log.
