# Autonomous decisions & build status

Decisions taken solo during the fast-track build (per the user's "decide yourself,
log it, we review later"). Review these together after v1 is built.

## Current build status (2026-09-22)

**The Astro app scaffold builds green.** Locally: `astro check` = 0 errors, production
build emits 8 pages, `npm audit` = 0 vulnerabilities. Pipeline proven end-to-end:
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

### Next (in order)

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

Add rows as further solo decisions are made.
