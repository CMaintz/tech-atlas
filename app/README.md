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
src/schema.ts                 the authored Term schema (Zod) — the single source of truth
src/content.config.ts         Astro content collection (glob loader over the YAML)
src/content/terms/<domain>/   authored bilingual Term files
src/pages/[lang]/             route-based i18n pages (index + term pages)
src/components/Graph.tsx       the Cytoscape neighbourhood island
scripts/build-graph.ts        derives depth, inverse edges, visual weight -> src/generated/graph.json
scripts/lint.ts               the content lint (structural checks; Closed Vocab stubbed)
content/allowed-words.*.txt   Closed Vocabulary escape hatch, per language
```

## Commands (via `mise` / npm)

```
npm run dev          # astro dev server
npm run build:graph  # regenerate src/generated/graph.json
npm run lint:content # run the content lint
npm run check        # astro check (typecheck)
npm run build        # lint -> build:graph -> astro build
```

The repo is gated by **Foundry** (`mise run gate` = lint → typecheck → test → audit).

## Status / what's stubbed

- **Done:** schema, content pipeline, bilingual routing, term pages with faceted
  bodies, a working neighbourhood graph, structural lint (dangling/ambiguous edges,
  requires-cycles, duplicate ids), derived graph build.
- **Stubbed / next:** Closed Vocabulary lint (E1) needs per-language plain-word
  lists; client-side search (MiniSearch); the Compare view; the 3D graph mode;
  full v1 content (both clusters, ~105 bilingual terms).

Seed content is three security terms (`social-engineering`, `phishing`, `mfa`)
proving the pipeline end-to-end.
