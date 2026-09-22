# Autonomous decisions & build status

Decisions taken solo during the fast-track build (per the user's "decide yourself,
log it, we review later"). Review these together after v1 is built.

## Current build status (2026-09-22)

**v1 builds green.** `mise run gate` passes; the production build emits 315 pages
(124 terms × 2 languages, index, 28 compare pairs, search index) with 0 broken internal
links; `npm audit` = 0 vulnerabilities. Pipeline proven end-to-end:
bilingual YAML → Zod validation → derived `graph.json` → `/en` + `/da` static pages +
Cytoscape neighbourhood graph.

### Done

- `app/` Astro 7 scaffold: `src/schema.ts`, content layer, 3 seed security terms
  (`social-engineering`, `phishing`, `mfa`), route-based bilingual pages, faceted
  term pages, Cytoscape island, Tailwind v4, prettier.
- `app/scripts/build-graph.ts` (derives depth / inverse edges / visual weight),
  `app/scripts/lint.ts` (structural checks pass; Closed-Vocabulary E1 stubbed).
- Foundry gate: `mise.toml` (6 verbs), `.github/workflows/gate.yml` (SHA-pinned),
  `AGENTS.md` + `CLAUDE.md`.
- `design/`: full `SPEC.md`, `schema.ts`, 9 ADRs, `UNIFIED_VISION.md` decision log.

### v1 content + features — done on `feat/v1-build`

124 bilingual terms (security GRC ordliste + CS networking/OS/identity/cryptography), all
`draft: true`; search; relationship sections; compare view (28 pairs); clickable graph;
Closed Vocabulary lint (E1) + full rule set; GitHub Pages deploy.

### Previously planned (kept for history)

1. **Full v1 content** — ~65 security terms (the course ordliste) + ~40 CS
   (networking / OS / identity), bilingual. Parallelise across agents.
2. **Closed-Vocabulary lint (E1)** — needs per-language plain-word lists.
3. **Search** (MiniSearch, bilingual) + **Compare view**.
4. **Deploy** to GitHub Pages. Pinned action SHAs already resolved:
   `configure-pages` `983d7736d9b0ae728b81ab479565c72886d7745b`,
   `upload-pages-artifact` `56afc609e74202658d3ffba0e8f6dda462b719fa`,
   `deploy-pages` `d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e`.
5. **Full-product build** — learning system (generated from edges), DB when learning /
   personalization / semantic search need it, 3D graph mode.

## Decisions log

| # | Decision | Rationale |
|---|---|---|
| A1 | **Working name = "Atlas"** | Matches the `tech-atlas` repo, the demo, and the earlier recommendation. |
| A2 | **Upgraded Astro 5 → 7.3.4** | The 5.x line carried 1 critical + 1 high advisory (XSS/RCE); the gate's `audit` verb requires fixing, not suppressing. Scaffold re-verified green on 7. |
| A3 | **MIT License** | Sensible default matching the Foundry ecosystem; swap if you prefer another. |
| A4 | **Gitignore raw source inputs** (docx / pdf / images / demo / `_ingest/` / "Syllabus etc/") | Keeps the repo focused on `design/` + `app/`, and avoids publishing the copyrighted course compendium. |
| A5 | **Repo layout: app in `app/`, specs in `design/`** | Keeps the implementation clean and separate from the design record. |
| A6 | **`test` verb = no-op, `audit` = `npm audit --audit-level=high`** | No tests yet (content site); `test` is a contract-required no-op until real tests exist. |
| A7 | **Cytoscape.js for the 2D graph; 3d-force-graph deferred for 3D** | Confirmed with the user; purpose-built 2D graph now, Three.js-based 3D later. |
| A8 | **IDS and IPS are two terms** (the ordliste lists "IDS / IPS" on one line) | They behave differently (watch vs block) and are a textbook "don't confuse" pair for the Compare view. |
| A9 | **ISO 27001 and ISO 27002 are two terms** (one ordliste line) | 27001 = management-system requirements; 27002 = control guidance. Different edges, so they pass the granularity test. |
| A10 | **`backup` and `endpoint` are single shared terms tagged `[security, cs]`**; the deliberate name collision is **`audit`** (compliance audit vs audit logging) | Backup/endpoint mean the same thing in both fields (merge is the ADR-0003 default); `audit` genuinely differs, so it exercises namespacing. |
| A11 | **`two-factor-authentication` is its own term, `kind-of mfa`** | The ordliste lists 2FA separately (granularity rule). |
| A12 | **Batch 2: 20 terms beyond the ordliste** (malware, asset, impact, likelihood, threat-actor, server, client, internet, HTTPS, hashing, certificates, keys, DoS, lateral movement, defence in depth, …) | Writers kept having to write around them — the Closed Vocabulary signal that they must exist as terms. |
| A13 | **`cryptography` added as a fourth CS cluster** | Keys, certificates, hashing and public-key crypto are needed to explain TLS/HTTPS/integrity. |
| A14 | **Closed Vocabulary base = FrequencyWords top-30k per language** (CC BY-SA 4.0), plus inflection stripping, plus Danish-only compound splitting | Open, per-language, frequency-ranked; English stays strict (no compound splitting). |
| A15 | **All content is `draft: true`**, including the three seed terms | LLM-drafted, not human-reviewed (pipeline rule, W5). You flip them after review. |
| A16 | **Manual `[lang]` routing; dropped Astro's i18n config and config redirect** | Simpler with the GitHub Pages base path; root `/` meta-refreshes to `/en/`. `hreflang` alternates added for SEO. |
| A17 | **Hosted on GitHub Pages** at `https://cmaintz.github.io/tech-atlas/`, deployed on every push to `main` | Free for public repos; static site fits exactly. |
| A18 | **Lint rule E5 (circular definition) deferred** | Needs definition-level graph analysis over the prose (which terms each definition leans on), not just edges. E1 already forces grounding in plain words; E5 is a follow-up. |
| A19 | **Symmetric edges live on the alphabetically-first id** | Deterministic rule so parallel authors never write the same pair twice (lint W7 flags duplicates). |
| A20 | **Content fixes from review:** SSL removed as a TLS alias (it is the predecessor, not a synonym); "virus" removed as a malware alias; DoS `exploits` retargeted from availability (a goal) to vulnerability; incident-reporting no longer `requires` data-breach (NIS2 covers all significant incidents). | Found by the fresh-context content review. |
| A21 | **Astro 7 editor JSON-schema warning left as-is** | Astro 7 can't generate IDE JSON schema from our zod-3 schema; validation itself works. Fix later by moving `schema.ts` to Astro's bundled zod. |

Add rows as further solo decisions are made.
