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

## License

MIT — see [LICENSE](LICENSE).
