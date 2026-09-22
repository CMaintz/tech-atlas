# TechLexicon / Lexicon / Atlas — Design Document Set

This directory is the assembled, purpose-split set of design documents for the
technical-glossary-as-knowledge-graph website you have been exploring. It was
built by ingesting **every** source file in this repository (the two chat
exploration sessions, the two Word specifications, the Feature Inventory of the
demo build, the `techlexicon/` working files and ADRs, the deep-research report,
and the graph-visualisation inspiration images).

**Nothing has been thrown away.** Where two or more sources cover the same
ground, both treatments are placed one after another under a shared heading and
each is tagged with its source, so you can see the overlaps side by side and
decide what to keep and what to cut. Reconciliation is deliberately *not* done
here — that is the next step, and this set is designed to make it easy.

---

## How to read this set

| # | Document | Purpose |
|---|----------|---------|
| 00 | `00_README.md` | This file: provenance key, the three-conception framing, the divergence table, un-ingested content. |
| 01 | `01_SPEC.md` | Product & feature specification — vision, positioning, audiences, product model/modes, term-page UX and information architecture, layered explanations, content/provenance model, ambiguity, compare, learning. |
| 02 | `02_SCHEMA.md` | Data model & schema — every entity model and relationship-type set found across the sources, verbatim, side by side. |
| 03 | `03_ARCHITECTURE.md` | Technical architecture — storage tradeoffs, search, tech stack, prototype decision plan, graph APIs, 3D spatial lenses, graph algorithms, progressive loading. |
| 04 | `04_ROADMAP.md` | Every phased build plan found in the sources, concatenated. |
| 05 | `05_FEATURE_OVERVIEW.md` | Catalogue of every feature discussed, proposed, or built — including the Atlas demo Feature Inventory and "suggestions not yet built". |
| 06 | `06_RESEARCH_OVERVIEW.md` | The deep-research report in full, plus the research findings recoverable from the conversation record. |
| 07 | `07_DECISIONS_AND_OPEN_QUESTIONS.md` | Everything marked Decided / Recommended / Under Consideration / Open, plus the open-question lists. |
| 08 | `08_PROJECT_VOCABULARY.md` | The project's own working vocabulary (carried forward from `techlexicon/CONTEXT.md`). |
| 09 | `09_VISUAL_DIRECTION.md` | Frontend/visual direction — the inspiration images described, the UI mockups from the chats, and the three demo variants. |
| — | `adr/` | The four architecture decision records, carried forward from `techlexicon/docs/adr/`. |

---

## Provenance key

Every transplanted block is tagged with the source it came from:

| Tag | Source file | Character |
|-----|-------------|-----------|
| **[S1]** | `chat exploration session.docx` | The long exploratory chat. Feature ideas, MVP architecture, database reasoning, 3D lenses, BFS/graph algorithms. The richest single source. |
| **[S2]** | `other chat exploration session.docx` | The second chat. Product framing, the seven "modes", learning map, term-page mockup, relationship types. |
| **[S3]** | `TechLexicon_Product_Architecture_Spec.docx` | The most finished write-up. Explicitly separates Decided / Recommended / Under Consideration / Open. Uses the 17-type snake_case relation set (same as [S1]) and 5 domains. |
| **[S4]** | `technical-knowledge-graph-product-development-document.docx` | A structured product development document. 24 numbered sections. Uses a 14-type relation set. |
| **[S5]** | `Feature Inventory.pdf` | The feature inventory of the **built demo** ("Atlas"). 109 terms, 178 edges, 17 relation types, 5 domains. Describes what actually exists in the three demo HTML files. |
| **[S6]** | `techlexicon/` | The disciplined "Lexicon" working files: `CONTEXT.md`, `docs/spec.md`, `schema.ts`, `docs/lint-rules.md`, `docs/adr/*`. A 9-type *closed* edge set, Closed Vocabulary, Depth derived from prerequisites, 4 domains. |
| **[S7]** | `deep-research-report.md` | An external research report on glossary sites, sources, schemas, UX, licensing, tooling, visualization. |

---

## The three conceptions (read this first)

The sources do not describe one product. They describe **three overlapping but
materially different conceptions** of the same idea, produced at different times
and with different priorities. Keeping them distinct is the single most important
thing when reading everything below.

### A. "Lexicon" — the disciplined static dictionary-as-graph  ·  [S6]
A principled, constrained content system. A **closed** set of nine edge types;
**Closed Vocabulary** (a definition may use only plain English plus other defined
Terms, enforced by lint); **Depth** computed from the `requires` DAG rather than
authored; domains as tags with namespaced collisions; a static-site build
pipeline (Astro or Next, undecided); content authored as files with a Zod schema.
Four domains (`cs`, `security`, `ai`, `platform`), launching with `cs` + `security`.
Opinionated, small, buildable, editorially strict.

### B. "TechLexicon" — the interactive knowledge-map platform  ·  [S1] [S2] [S3] [S4]
A broader vision: glossary **+** typed knowledge graph **+** learning system, with
a database-backed application. 14–18 relationship types; PostgreSQL-vs-Neo4j
prototyping; pgvector semantic search; quizzes, flashcards, learning paths,
personal knowledge map; 3D spatial lenses; compare mode; bridge-finding; an
AI tutor grounded in the graph. Five domains (CS, Software Engineering, Platform
Engineering, AI, Cybersecurity). Ambitious, feature-rich, architecture-heavy.

### C. "Atlas" — the built demo  ·  [S5]
The prototype that actually exists (three HTML files: Atlas, Atlas Dark, Atlas
Neon). 109 terms, 178 typed edges, 17 relation types across 4 families, 5 domains.
A hand-built 3D canvas renderer (no external graph library). Data authored in
`glossary-data.js`, separate from every UI. Includes a term panel, study/quizzes,
and a documented list of suggestions not yet built.

These three share DNA — typed edges, layered definitions, "don't make 3D the
default", prerequisites-as-learning-paths, compare mode, avoid-the-hairball — but
diverge on specifics. The divergences you will need to resolve are tabulated next.

---

## Divergence table — the decisions the sources disagree on

This is the agenda for the cut/keep session. Each row is a point where the sources
give different answers; the right-hand column says where each variant lives.

| Topic | Variant A (Lexicon) | Variant B (TechLexicon) | Variant C (Atlas) | Where documented |
|---|---|---|---|---|
| **Edge/relation type set** (4 distinct sets) | 9 types, *closed* set (`requires`, `kind-of`, `part-of`, `contrasts-with`, `implements`, `supersedes`, `causes`, `mitigates`, `exploits`) [S6] | 17 snake_case types incl. `broader_than`/`narrower_than`/`synonym_of`/`used_for`/`related_to` fallback — same set in [S3] (table) and [S1] (TS union); a 14-type hyphenated set — same in [S2] and [S4] | 17 hyphenated types in 4 families (Taxonomy, Mechanics, Lineage, For study) = the 14-set + 3 added (instance-of, solves, supersedes) [S5] | `02_SCHEMA.md` §1 |
| **Number of domains** | 4: cs, security, ai, platform [S6] | 5: CS, SE, Platform, AI, Security [S3][S4] | 5 domains [S5] | `01_SPEC.md`, `02_SCHEMA.md` |
| **Launch domains** | cs + security together [S6] | not fixed | (demo spans all) | `04_ROADMAP.md` |
| **Definition style** | Summary (≤140 chars) + Body, both in Closed Vocabulary; optional Article exempt [S6] | Layered: Formal / Plain English / In Practice / Why it matters [S1][S3]; short + long [S5] | short + long fields [S5] | `01_SPEC.md` §Layered explanations |
| **Closed Vocabulary constraint** | Core, lint-enforced [S6] | not present | not present | `02_SCHEMA.md`, `adr/0004` |
| **Vertical axis / abstraction** | **Depth**, derived from `requires` DAG; `layer` is a facet not a position [S6] | Configurable spatial lenses; abstraction as partial order, not a numeric ladder [S1][S3][S4] | Hand-assigned levels 1–5, now superseded by derived taxonomy depth or free layout [S5] | `03_ARCHITECTURE.md` §3D lenses, `adr/0001` |
| **Persistence** | Content files → static build (JSON graph) [S6] | Prototype Postgres-first vs Neo4j-first; pgvector; maybe Apache AGE; maybe Postgres+Neo4j [S1][S3] | In-file JS data, no DB [S5] | `03_ARCHITECTURE.md` §Storage |
| **Search** | (implied; static) [S6] | Postgres FTS + pgvector; Meilisearch or OpenSearch later [S1][S3] | client-side over corpus [S5] | `03_ARCHITECTURE.md` §Search |
| **Framework** | Astro or Next, undecided [S6] | Next.js + React + TS + Tailwind + shadcn [S1][S3] | Vanilla HTML/JS/canvas [S5] | `03_ARCHITECTURE.md` §Tech stack |
| **Graph renderer** | 2D default, 3D as a mode [S6] | 3d-force-graph / Three.js; React Flow for 2D [S1][S3] | Hand-built canvas force renderer, no library [S5] | `03_ARCHITECTURE.md`, `09_VISUAL_DIRECTION.md` |
| **Working name** | "Lexicon" (explicit placeholder) [S6] | "TechLexicon" [S3][S5] | "Atlas" (demo) [S5] | here |
| **Roadmap shape** | 5 phases, content-milestone gated [S6] | V1/V2/V3 [S3]; V1/V1.5/V2/V2.5/V3 [S1] | (demo is a snapshot) | `04_ROADMAP.md` |
| **Quizzes** | reserved, sibling `.quiz.yaml`, cloze/contrast/prereq [S6] | adaptive, graph-generated; 6 question kinds [S2][S4]; spaced repetition [S1] | generated question sets with running score, built in demo [S5] | `01_SPEC.md` §Learning, `05_FEATURE_OVERVIEW.md` |
| **AI tutor** | out of scope | Under Consideration; grounded in graph+evidence, never source of truth [S1][S3] | not present | `07_DECISIONS_AND_OPEN_QUESTIONS.md` |

---

## Un-ingested content (flagged, not thrown away)

Per your instruction, the demo's UI code was **not** ingested. Two files in the
demo directory are, however, **authored content rather than scaffolding**, and are
noted here so they are not lost:

- **`Technical glossary with 3D visualization/glossary-data.js`** — holds the
  actual **109-term / 178-edge corpus** (the real content the demo renders). This
  is genuine authored data, not UI code. Recommend extracting it to a structured
  data file (JSON/YAML) as a follow-up; it is the closest thing to a seed dataset
  that exists.
- **`Technical glossary with 3D visualization/deep-content.js`** — holds the
  **six authored long-form entries** referenced by the Feature Inventory ("Six of
  109 are authored" [S5]). Also real content worth extracting.

Also not ingested (genuinely presentation/scaffolding): the three `*.dc.html`
files, `doc-page.js`, `support.js`, and the `_ds/` design-system bundle.

Say the word and I will extract `glossary-data.js` and `deep-content.js` into a
clean data document.

---

## A note on fidelity

Text lifted from the two Word documents was extracted with `mammoth`, which
escapes punctuation (`\.`, `\-`, `\_`). That mechanical escaping has been cleaned
where content was transplanted; no wording was changed. The Feature Inventory PDF
was read from its rendered pages (it is a designed document, not a text file).
