# Changelog

Atlas follows [semantic versioning](https://semver.org) with beta pre-releases
(v2.0.0-beta.1, beta.2, ... then v2.0.0 at launch). New entries are generated from
conventional commits by `scripts/cut-release.sh`; see README "Releasing".

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
