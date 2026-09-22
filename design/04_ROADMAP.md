# 04 — Roadmap

Purpose: every phased build plan found in the sources, reproduced in full and
side by side. They do not agree on phase boundaries or ordering — that is a
decision for the cut/keep session. See the divergence table in `00_README.md`.

---

## 1. [S3] TechLexicon — the V1 / V2 / V3 roadmap

| Phase | Goal | Core scope |
|---|---|---|
| **V1** | Useful glossary with structured foundations. | Term pages, layered definitions, domains, aliases, external resources, typed relations, PostgreSQL-first prototype, lexical and semantic search, depth-1 graph view. |
| **V2** | Knowledge-graph learning product. | 2D map, 3D graph, progressive loading, filters, prerequisites, compare mode, shortest path, BFS visualization, editorial provenance UI, quizzes. |
| **V3** | Adaptive learning and graph intelligence. | Personalized learning paths, flashcards, AI tutor grounded in graph and evidence, centrality and community discovery, graph database if validated, advanced semantic search. |

---

## 2. [S1] Chat — the V1 / V1.5 / V2 / V2.5 / V3 roadmap

### V1 — The excellent glossary
Search · Term pages · aliases · domains/categories · concise definitions · "in
simple terms" · examples · related terms · sources · external resources · basic
hierarchy · responsive UI.

### V1.5 — Knowledge graph
typed relationships · 2D graph · graph exploration · prerequisite relationships ·
"see how X relates to Y" · path finding · compare terms.

### V2 — Learning
questions · quizzes · flashcards · difficulty · learning paths · progress · spaced
repetition.

### V2.5 — 3D
3D galaxy · clusters · filtering · domain colouring · depth controls · animated
traversal · graph search.

### V3 — Intelligent glossary
semantic search · personalised explanations · "teach me" · adaptive learning paths
· AI-generated questions · concept gap detection · automatic relationship
suggestions · human verification workflow.

> [S1] "That progression means you don't need to solve the entire knowledge-graph
> problem before having a useful website."

---

## 3. [S6] Lexicon — the 5-phase, content-milestone-gated roadmap

From `techlexicon/docs/spec.md`. Note that phases are gated by **content
milestones and model-survival tests**, not by feature completeness.

| Phase | Ships | Done when |
|---|---|---|
| **1** | Schema, lint, build pipeline. Two pilot Clusters: CS concurrency (~40 Terms) and security auth/crypto (~40 Terms), chosen to collide and bridge. Graph renders. | The model survives 80 real Terms, collisions resolve, the graph doesn't look like a hairball. |
| **2** | Static Term pages, search, Aliases, sidebar graph, SEO. | The course reader can look things up on a phone. This is the first phase with a user. |
| **3** | Content to ~250 CS + ~150 security. Articles for the twenty Terms that need them. | Coverage map has no Cluster under ten. |
| **4** | 3D mode, Paths, compare view, era view. | |
| **5** | Study mode. AI and platform Domains. | |

> [S6] "Phase 2 before phase 4 is deliberate: lookup beats spectacle, and there is
> a reader waiting on lookup."

### [S6] Content pipeline (the phase-1 machinery)
Curated term list → LLM first draft against the schema → human edit, every entry →
lint. `draft: true` until edited; the draft ratio is reported on every build (W5).
"The failure mode is rubber-stamping drafts, so the count is made loud rather than
left implicit."

---

## 4. [S3] Prototype phase (precedes V1 in the B-vision)

Before committing to persistence, build two prototypes against the same five graph
queries (direct neighbors; N-hop neighborhood with filters; BFS; shortest path with
constraints; prerequisite/learning-path generation). Full detail in
`03_ARCHITECTURE.md` §4. Decision output: PostgreSQL-first vs graph-first vs hybrid.

---

## 5. Cross-roadmap comparison (for the cut/keep session)

The three roadmaps agree on the *arc* (excellent glossary → typed graph → learning
→ 3D/intelligence) but cut the phases differently and gate them differently:

| Stage | [S6] Lexicon | [S3] TechLexicon | [S1] Chat |
|---|---|---|---|
| Foundations | Phase 1 (schema, lint, pilot content, graph renders) | (prototype phase) | — |
| Excellent glossary | Phase 2 (pages, search, aliases, SEO) | V1 | V1 |
| Typed graph | Phase 4 (partly) | V2 | V1.5 |
| Content depth | Phase 3 (coverage milestones) | (within V1/V2) | (within V1) |
| Learning / quizzes | Phase 5 (study mode) | V2 (quizzes) / V3 (flashcards) | V2 |
| 3D | Phase 4 | V2 | V2.5 |
| AI / intelligence | — | V3 | V3 |

Key differences to resolve:
- **What gates a phase:** Lexicon gates on content-coverage milestones and
  model-survival; the B-vision gates on feature sets.
- **When 3D ships:** Lexicon phase 4 and S1 V2.5 both defer 3D deliberately;
  S3 brings it forward into V2.
- **When learning ships:** Lexicon defers study mode to the last phase (phase 5,
  alongside the AI/platform domains); S1 puts learning at V2; S3 splits quizzes
  (V2) from flashcards/AI-tutor (V3).
- **Prototype-first vs build-first:** only the B-vision has an explicit
  prototype-two-databases phase; the Lexicon skips it (no database).
