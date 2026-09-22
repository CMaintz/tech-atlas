# 07 — Decisions & Open Questions

Purpose: everything the sources mark as Decided / Recommended / Under Consideration
/ Open, plus the open-question lists and the current baseline. The [S3] Product &
Architecture Spec is the only source that formally tags status, so its status
system is used as the spine; other sources' positions are noted where they differ.
Formal **architecture decision records** are carried forward in `adr/` and
summarised in §5.

---

## 1. [S3] Status system (definitions)

| Status | Meaning in the source |
|---|---|
| **Decided** | A product or architecture direction established in the conversation and used as the baseline for future design. |
| **Recommended** | The preferred path based on current reasoning, but still subject to validation in prototypes or user testing. |
| **Under Consideration** | A promising idea that should be explored, scoped, or validated before being treated as core product behavior. |
| **Open** | A question that still needs research, prototyping, or editorial policy before implementation. |

---

## 2. Decided (baseline)

### [S3] Current Baseline Decisions (verbatim)
- TechLexicon is a glossary plus knowledge graph plus learning system.
- Term pages remain the primary default UX.
- The graph is functional and typed, not decorative.
- "Continue learning" replaces a generic "read more" link.
- Relationships need type, confidence, description, and evidence.
- Coordinates in 3D are derived from selected lenses rather than stored as
  canonical positions.
- Graph distance should be represented through hop depth or radial distance from
  the focal node.
- BFS, shortest path, prerequisite paths, and compare mode are important product
  concepts.
- PostgreSQL plus pgvector is the recommended initial search and content store.
- Neo4j or another graph database should be evaluated through a prototype before
  the architecture is locked.

### [S3] Other items explicitly marked Decided in the body
- **Product Vision** — glossary + typed graph + learning layer.
- **Scope And Domains** — five overlapping domains; terms may belong to multiple;
  domain-specific meanings for ambiguous words.
- **Glossary / Knowledge Graph / Visualization / Search** — Decided core areas
  (see `05_FEATURE_OVERVIEW.md` Part 2).
- **Term Page UX** — the normal term page is the primary learning surface; the
  graph is reached through exploration actions.
- **External Learning Resources** — a "Continue learning" area, resource types
  with content policy.
- **Content And Provenance Model** — separate Knowledge / Evidence / Presentation /
  Editorial Metadata.
- **Knowledge Graph Model** — relationships must be typed.
- **Hierarchy And Learning Paths** — taxonomy and learning sequence are different
  models.
- **Graph Visualization** — functional not decorative; 3D Galaxy view Decided.
- **Progressive Loading** — do not render the whole graph on open.
- **Three-Dimensional Spatial Lenses** — do not store permanent x/y/z; derive from
  the selected lens.
- **Graph Algorithms And Exploration** — expose algorithms as learning/exploration
  tools.
- **Search Architecture** — search by exact term, typo, abbreviation, plain
  language, relationship intent.

### [S5] Atlas — decisions embodied in the built demo
- Data authored separately from every UI (`glossary-data.js`), imported unchanged.
- Edges authored one-way; inverses derived at load.
- The vertical axis is **derived** (taxonomy depth), not hand-assigned — the
  hand-assigned levels are superseded (retained only for the light Stack view).
- 3D is a view among several (Explore / Index / Stack / Confused / Study / Full
  page), not the only interface.
- Distractor filtering in quizzes excludes taxonomically/similarly linked terms.

### [S6] Lexicon — decisions embodied as ADRs and the spec
- Depth is derived from the `requires` DAG (ADR-0001).
- A three-part granularity test decides what earns its own Term (ADR-0002).
- Domains are tags; collisions are namespaced (ADR-0003).
- Closed Vocabulary binds Summary and Body but not Articles (ADR-0004).
- Closed 9-type edge set; lint enforces the quality bar; content pipeline is
  curate → LLM draft → human edit → lint.
- 2D graph is the default; 3D is a mode justified only by the Depth axis.
- Launch domains are cs + security, together.
- Status of the ADRs themselves: all four are marked `status: proposed`.

---

## 3. Recommended (preferred, not yet validated)

### [S3]
- **Learning System** — prerequisites, next concepts, quizzes, flashcards,
  learning paths.
- **Terminology Ambiguity** — ambiguous terms resolve to meaning-specific entries.
- **Comparison And Difference Mode** — compare mode should be first class.
- **2D Map / Hierarchy / Learning Path** views — Recommended.
- **PostgreSQL full-text search + pgvector** as the starting point; add OpenSearch
  only when justified.
- **Prototype Decision Plan** — build PostgreSQL-first and graph-first prototypes
  against the five queries before committing.
- **Prerequisite Cards, Next Concepts** — Recommended learning features.
- **Radial/hop distance** for relationship closeness rather than a permanent axis.

### [S1]
- Boring stack (Next.js + React + TS + Tailwind + shadcn + TanStack Query).
- 3d-force-graph for 3D; React Flow for 2D (with the caveat it suits structured
  diagrams more than massive graphs).
- Prototype two database variants; skip OpenSearch initially.
- Choose the database by intended core product identity (glossary-first → Postgres;
  graph-first → Neo4j).

---

## 4. Under Consideration

### [S3]
- **AI Tutor** — adaptive explanations grounded in the graph and evidence model.
- **Compare Graph** view — relationship-focused shared-ancestor/contrast view.
- **Mini Curricula, Quizzes, Flashcards, Explain Using Known Concepts** — learning
  features Under Consideration.

### [S5] Atlas — "suggestions not yet built"
Deep content for more terms · per-term study tracking · Dark's selection pulse
(bring in line) · animated edges in the light variant · node particle effects ·
deep-linkable terms · learning paths. (Full notes in `05_FEATURE_OVERVIEW.md` §10.)

---

## 5. Architecture Decision Records (carried forward)

The four ADRs from `techlexicon/docs/adr/` are reproduced in `design/adr/`. All are
`status: proposed`.

| ADR | Decision | One-line rationale |
|---|---|---|
| **0001** | Depth is derived from the prerequisite graph, not authored per term. | Costs no authoring effort, can't drift, works across domains; gives 3D a meaningful vertical axis. |
| **0002** | A concept earns its own Term by passing a three-part test (searched alone · survives a standalone Summary · carries an Edge the parent doesn't). | "One Term per concept" is unfalsifiable; the test is mechanically checkable (lint warns). |
| **0003** | Domain is a set of tags; name collisions become separate namespaced Terms. | Security is a launch domain; collisions (`token`, `key`, `salt`, `nonce`) must be modelled from the first file. |
| **0004** | Closed Vocabulary binds Summary and Body but not Articles. | The constraint guarantees real edges but can't survive long-form; scoping it keeps the strict layer small. |

---

## 6. Open questions

### [S3] Open Questions And Decisions To Validate (with why + validation method)
| Question | Why it matters | Validation method |
|---|---|---|
| Is the product glossary-first or knowledge-graph-first? | Determines whether PostgreSQL-first is enough or Neo4j should become central. | Build the two prototypes and compare the five graph queries. |
| How many relation types are needed for V1? | Too many slow editorial work; too few weaken graph behavior. | Seed 100–300 terms and classify relationships. |
| How should abstraction / difficulty / complexity be scored? | These drive spatial lenses and learning paths but are partly subjective. | Create an editorial rubric and test consistency across domains. |
| What is the minimum provenance policy? | Evidence quality affects trust, especially if AI assists content creation. | Define source requirements per claim type. |
| Which external resources deserve inclusion? | Current context has examples but not a complete ranked research list. | Recover or redo resource research and create curation criteria. |
| Can PostgreSQL handle target graph queries cleanly? | Avoids unnecessary infrastructure if yes. | Implement N-hop, path, BFS, and prerequisite queries in PostgreSQL. |
| Does Neo4j materially simplify graph features? | Justifies additional infrastructure only if the product gains enough. | Implement the same queries in Neo4j and compare code, speed, flexibility. |
| Which 3D spatial lenses do users actually understand? | A powerful lens can still confuse users if the semantics are unclear. | Prototype axis modes and user-test with representative learners. |
| What does V1 search quality need to be? | Search failure hurts more than many missing advanced graph features. | Test lexical, alias, semantic, and compare-intent queries. |
| How should AI-tutor features be constrained? | The tutor must not override the evidence model or invent facts. | Design grounding, citation, and refusal rules before implementation. |

### [S4] Open Questions for Future Specification
- Which domains and subdomains are included in the first release?
- Which relationship types are authoritative enough to model explicitly?
- Which content is manually curated versus generated with AI and subsequently
  reviewed?
- How should confidence and source provenance be represented?
- How should conflicting or context-dependent relationships be handled?
- What exact semantics should abstraction and complexity have?
- Which graph queries belong in the initial product?
- What is the minimum viable 3D experience?
- How should learner knowledge be persisted and updated?
- How should quizzes measure understanding rather than recognition?

### [S6] Lexicon — Open questions
- **Working name.** `lexicon` is a placeholder.
- **Which cybersecurity course, specifically?** Its syllabus seeds the security
  term list and settles granularity calls.
- **Astro or Next.** Astro suits a content site with an interactive island; Next is
  one framework for everything. "Not urgent — phase 1 produces a JSON graph either
  way."

### Cross-source meta-questions (implied by the divergences — for the cut/keep session)
These are not stated in any single source but fall directly out of the divergence
table in `00_README.md`:
- **Which conception governs?** Lexicon (disciplined static dictionary) vs
  TechLexicon (database-backed knowledge-map platform) vs a hybrid. Every other
  decision below inherits from this.
- **Which relation-type set?** 9 closed / 14 / 17 / 18.
- **Four domains or five?** (Is Software Engineering its own domain, or folded into
  CS as in the Lexicon?)
- **Closed Vocabulary — in or out?** It is central to the Lexicon and absent from
  the B-vision.
- **Layered explanations vs Summary/Body/Article** — two different definition-shape
  models.
- **Which working name** — Lexicon / TechLexicon / Atlas / something new.
