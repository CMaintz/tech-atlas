# Atlas

A bilingual (English + Danish) technical dictionary whose typed, sourced
relationships make it a navigable knowledge graph. See the full design in
[`../design/SPEC.md`](../design/SPEC.md) and the decisions in
[`../design/adr/`](../design/adr/) and
[`../design/UNIFIED_VISION.md`](../design/UNIFIED_VISION.md).

## Stack

- **Astro** (static-first, ADR-0008), route-based i18n (`/en/`, `/da/`, ADR-0007)
- **Preact** islands; **Cytoscape.js** for the 2D graph (3D via 3d-force-graph later)
- **Tailwind v4**; content authored as **YAML** validated by **Zod** (`src/schema.ts`)
- Custom build/lint scripts (`scripts/`) — the content-quality engine

## Layout

```
src/schema.ts                   the authored Term schema (Zod) — the single source of truth
src/content.config.ts           Astro content collection (glob loader over the YAML)
src/content/terms/<domain>/     authored bilingual Term files (security/, cs/)
src/lib/site.ts                 base-path-aware URLs, UI strings (EN/DA), cluster labels
src/lib/terms.ts                relationship resolution, inverse edges, compare pairs
src/pages/[lang]/               index (+ search), terms/<id>, compare/ and compare/<a>-vs-<b>
src/pages/search-index.json.ts  static search index for the Search island
src/components/                 Graph.tsx (Cytoscape neighbourhood), Search.tsx (MiniSearch)
scripts/                        build-graph, lint, closed-vocab, vocab-report, load-terms
content/manifest.yaml           the canonical term list — edges may only target these ids
content/AUTHORING.md            how to write a Term
content/allowed-words.*.txt     Closed Vocabulary escape hatch, per language
content/wordlists/              plain-language base for Closed Vocabulary (CC BY-SA 4.0)
```

## Commands

```
npm run dev            # astro dev server
npm run lint:content   # the content lint (E1–E11, W1–W8)
npx tsx scripts/vocab-report.ts   # which unknown words recur (Closed Vocabulary triage)
npm run build:graph    # regenerate src/generated/graph.json
npm run embed          # re-embed terms for semantic search (after editing a name, alias, summary or plain facet; lint E11/W8)
npm run check          # astro check (typecheck)
npm run build          # lint -> build:graph -> astro build
```

The repo is gated by **Foundry** (`mise run gate` = lint → typecheck → test → audit) and
deployed to GitHub Pages on every push to `main`: https://cmaintz.github.io/tech-atlas/

## Features (v1)

- Bilingual term pages (`/en/`, `/da/`) with the four-facet body, generated relationship
  sections, draft banner, sources, and an interactive neighbourhood graph.
- Index grouped by domain and cluster, with typo-tolerant bilingual search.
- Compare view ("don't confuse these") generated from every `contrasts-with` edge.
- Content lint: Closed Vocabulary (English blocking, Danish advisory), dangling /
  ambiguous edges, `requires` cycles, tautological summaries, alias collisions,
  layer/domain mismatch, orphans, thin neighbourhoods, duplicate symmetric edges.

All content is `draft: true` until a human reviews it.
