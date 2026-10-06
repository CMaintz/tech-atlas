# Atlas — agent standing context

Atlas is a bilingual (English + Danish) technical dictionary whose typed, sourced
relationships make it a navigable knowledge graph. The authoritative spec is
[`design/SPEC.md`](design/SPEC.md); decisions are in [`design/adr/`](design/adr/) and
[`design/UNIFIED_VISION.md`](design/UNIFIED_VISION.md). **When spec and code disagree,
the spec wins.** Agents log their autonomous decisions locally, in the git-ignored
`.local/` (never committed): don't add decision logs to the repo, and don't cite
decision IDs (A12, U37, ...) in code or docs; a comment states its reason in plain words.

## The gate — six verbs (Foundry)

Invoke verbs, never tools. `mise run gate` is the only authority for "done".

| Verb | Contract |
|---|---|
| `mise run fix` | Apply mechanically-safe fixes (format). |
| `mise run lint` | Report style (Prettier, ESLint) + content-model violations, and size: no function over 18 logical lines, no code file over 300 lines (`npm run lint:size`, `app/scripts/size-rules.ts`). |
| `mise run typecheck` | Static type analysis: `astro check` for the app (everything `app/tsconfig.json` includes: `src/`, `scripts/`, `integrations/`, tests; Astro's strict preset), `deno check` for the Edge Functions (`supabase/functions/**`, incl. `_shared`). |
| `mise run test` | Unit tests (Vitest) + the production build as a smoke test. No coverage floor yet. Browser smoke tests (`mise run e2e`) and coverage (`mise run coverage`) run in CI (`tests.yml`), outside the gate. |
| `mise run audit` | Dependency vulnerabilities (ratcheted: high+ fails unless accepted with a reason in `app/.audit-allowlist.json`), registry signatures, secrets in git history. |
| `mise run gate` | lint -> typecheck -> test -> audit. **Green gate from a clean tree, or it is not done.** |

Rules: pin everything (tool versions in `[tools]`, CI actions by SHA). Never weaken a
rule to pass it. Work on branches, PR into `main`.

CI is [Foundry](https://github.com/CMaintz/foundry) v2, consumed through its two facades
(pinned by SHA): `.github/workflows/gate.yml` calls `gate.yml` (stack `ts`,
`working_directory: app`: the verbs above plus structural smells) and `security.yml`
calls `security.yml` (gitleaks, ruleset-guard, Semgrep). Structural smells are
habit-hooks, configured in `app/.habit-hooks/config.toml` with the accepted baseline in
`app/.habit-hooks/snooze.json`: never edit the baseline by hand; the `bootstrap`
workflow seeds and prunes it. Changing a gate-defining file (`mise.toml`, the
workflows, `app/.habit-hooks/`, `.gitleaks.toml`, ...) in the same PR as source needs
the `ruleset-change` label.

## The app (`app/`)

Astro 7 static-first (ADR-0008), route-based i18n `/en` `/da` (ADR-0007), Preact +
Cytoscape islands, Tailwind v4. Content is bilingual YAML under
`app/src/content/terms/<domain>/`, validated by `app/src/schema.ts` (the single
source of truth). Derived data (depth, inverse edges, visual weight) is computed by
`app/scripts/build-graph.ts`; the content lint is `app/scripts/lint.ts`.

## Core conventions

- **Closed Vocabulary** (ADR-0004/0009): a Summary/Body may use only plain language +
  other defined Terms + `allowed-words`. Enforced by lint (English blocking, Danish
  advisory in v1).
- **Curated closed edge set** of 12 types (ADR-0006), authored one direction; inverses
  derived. No `related_to`.
- **Bilingual** everywhere (ADR-0007): every human string is `{ en, da }`.
- **Derive, don't author** (ADR-0001): depth, inverses, weight, mentions are build
  artefacts, never committed.
