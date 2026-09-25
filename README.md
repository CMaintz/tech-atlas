# tech-atlas

**Atlas** — a bilingual (English + Danish) technical dictionary whose typed, sourced
relationships make it a navigable knowledge graph. Anchored to a real Danish
cybersecurity (GRC) course; built to grow across CS, AI and platform domains.

- **Spec & decisions:** [`design/`](design/) — `SPEC.md`, `schema.ts`,
  `UNIFIED_VISION.md`, `AUTONOMOUS_DECISIONS.md`, `adr/`.
- **App:** [`app/`](app/) — Astro 7 static site. See [`app/README.md`](app/README.md).
- **Gate:** Foundry (`mise run gate`). See [`AGENTS.md`](AGENTS.md).

## Quick start

```
cd app
npm ci
npm run dev      # dev server
npm run build    # lint -> derive graph -> static build
mise run gate    # the full quality gate (from repo root)
```

## Data

The site publishes its content as open data: every term as JSON (`/api/terms.json`,
`/api/terms/<folder>/<id>.json`), a CSV (`/api/terms.csv`), Anki import files per
language, the derived graph (`/graph.json`) and an RSS feed of new terms per language.
The list, with formats, is on the site's **Data** page (`/en/data/`, `/da/data/`).

## License

- **Code:** MIT, see [LICENSE](LICENSE).
- **Content** (terms, articles, allowed-words lists and the published data):
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), see
  [CONTENT-LICENSE.md](CONTENT-LICENSE.md) for the scope, the attribution line and the
  reasoning.
