# Atlas — agent standing context

Atlas is a bilingual (English + Danish) technical dictionary whose typed, sourced
relationships make it a navigable knowledge graph. The authoritative spec is
[`design/SPEC.md`](design/SPEC.md); decisions are in [`design/adr/`](design/adr/),
[`design/UNIFIED_VISION.md`](design/UNIFIED_VISION.md), and
[`design/AUTONOMOUS_DECISIONS.md`](design/AUTONOMOUS_DECISIONS.md). **When spec and
code disagree, the spec wins.**

## The gate — six verbs (Foundry)

Invoke verbs, never tools. `mise run gate` is the only authority for "done".

| Verb | Contract |
|---|---|
| `mise run fix` | Apply mechanically-safe fixes (format). |
| `mise run lint` | Report style + content-model violations. |
| `mise run typecheck` | Static type analysis (`astro check`). |
| `mise run test` | Unit tests (Vitest) + the production build as a smoke test. No coverage floor yet. |
| `mise run audit` | Dependency vulnerabilities. |
| `mise run gate` | lint -> typecheck -> test -> audit. **Green gate from a clean tree, or it is not done.** |

Rules: pin everything (tool versions in `[tools]`, CI actions by SHA). Never weaken a
rule to pass it. Work on branches, PR into `main`.

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
