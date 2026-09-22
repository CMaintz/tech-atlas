# 05 — Feature Overview

Purpose: a catalogue of every feature discussed, proposed, or built across all
sources. It is organised as: (1) the built demo's feature inventory [S5], then
(2) the proposed/candidate feature lists from the other sources. Overlaps are kept
side by side. See `00_README.md` for the provenance key and `01_SPEC.md` /
`03_ARCHITECTURE.md` for the detailed treatments.

---

## PART 1 — The built demo (Atlas)  ·  [S5]

Source: `Feature Inventory.pdf`, headed *"Atlas: feature inventory — Every feature
discussed, proposed or built across the three demo variants of the technical
glossary, with its status and where it lives."* Three files: **Atlas** (light
Modernist), **Atlas Dark**, **Atlas Neon**. All three read the same corpus and the
same relationship model.

**Corpus:** 109 terms · 178 typed edges · 17 relation types · 5 domains.

### 1. The data model
Authored in `glossary-data.js`, separate from every UI; all three variants import
it unchanged. Fields: `id`, `term`, `aka`, `field`, `short`, `long`, `level`,
`rel` (full table in `02_SCHEMA.md` §2g).

### 2. Relationship types
17 types in four families (Taxonomy / Mechanics / Lineage / For study) — "your
original fourteen, plus three added." The grouping drives sidebar sections, edge
colour and line style, and the link filters. Full table in `02_SCHEMA.md` §1f.
Edges authored one-way; inverses derived at load; symmetric types keep their label
both directions; aliases (`aka`) are a per-term field, not an edge.

### 3. The 3D graph (as built)
Hand-built canvas renderer — force-directed layout solved once at load, then each
frame projected. No external graph library. Detailed mechanics:

| Feature | Behaviour |
|---|---|
| **Layout** | Force solve — inverse-square repulsion between every pair, spring attraction along every edge, cooling schedule; 320 iterations in the light variant, 340 in Dark and Neon. Domains sit on a circle so clusters separate. |
| **Node size** | Degree-scaled in all three. Neon uses `4.2 + √degree × 2.7` — a 30-link hub reads as larger without swamping a 2-link leaf; the other two use a capped linear scale. |
| **Node colour** | One hue per domain. Neon adds a radial-gradient halo, outer glow and a specular highlight. |
| **Selection pivot** | The selected node is the rotation origin and sits dead centre; selecting another swings the whole scene around the new anchor. |
| **Selection pulse** | Three rings born at the node's own edge, expanding outward while fading quadratically to nothing, staggered a third of a cycle apart. Outward only — no breathing in and out. (Light and Dark; Dark keeps the earlier treatment: one ring at a fixed offset whose radius oscillates, which breathes rather than travels.) |
| **Edge animation** | Dashes travel source → target via an animated dash offset. Links touching the selection run roughly four times faster, brighter, with a glow; everything else dims. (Dark and Neon only — not built for the light variant.) |
| **Edge styling** | Line style and colour encode the relationship family: solid taxonomy, long-dash mechanics, dotted lineage, short-dash study. |
| **Focus dimming** | Selecting a term drops everything outside its immediate neighbourhood to ~24% opacity, so nothing in the term's connections reads instantly. |
| **Auto-fit camera** | Recomputes the visible bounding box every frame and eases scale toward a fit, so filtering or rotating never pushes the graph off-canvas. |
| **Label placement** | Priority order (selected → hovered → neighbour → high-degree), three candidate positions per label, collision rejection against placed labels and against UI overlays. |
| **Background motes** | 300 domain-tinted particles on a sphere, projected with the same camera, giving a parallax depth. (Neon only; toggleable.) |
| **Controls** | Left-drag orbits, scroll zooms, click selects, hover previews, Escape deselects; auto-rotate pauses on first manual orbit. Right-drag (or middle, or shift-drag) panning is in Dark and Neon. |

### 4. The vertical axis
The hand-assigned abstraction levels were well placed but four options were
weighed; the resolution is to **derive** the axis instead of assigning it. Two live
toggles in Dark and Neon:
- **Taxonomy depth** — height is distance along `is-a` / `part-of` chains to a
  root. General above, specific below. Derived from the edges, so it cannot
  contradict the data.
- **Free layout** — no vertical meaning; pure force. Clusters read as domains.
  Default in Neon.
The original hand-assigned levels survive in `glossary-data.js` and drive the light
variant's Stack view.

### 5. Views
| View | What it does | Where |
|---|---|---|
| **Atlas / Explore** | The 3D graph, with domain and link-type filters. | All three |
| **Index / Dictionary** | Every term grouped by domain, with definition and connection count; live search across terms, aliases and definitions. | All three |
| **Stack** | The abstraction bands flattened into a vertical read, each with a note on what it hides. | Light |
| **Confused** | Authored comparison tables for pairs learners mix up, on the axes that separate them. | All three |
| **Study / Quizzes** | Generated question sets with a running score. | All three |
| **Full term page** | Long-form entry behind "More" / "Read the full entry". | Dark, Neon |

### 6. The term panel
Sits beside the graph rather than replacing it, resizable rather than fixed. Drag
handle (720–900px), `‹ ›` preset widths, `✕` collapses. Definition then longer
read; relationships grouped by family; Key Concepts (taxonomic links, two columns,
Neon); Related Terms with "Show more" (past six, Neon); Check yourself (three study
prompts from the term's own edges); See Also (confusion pairs and alternatives as
chips, Neon). Full detail in `01_SPEC.md` §5.

### 7. The full term page (eight sections)
Lede + long-form explanation · Diagram (hand-built layered structure stack,
left-to-right sequence flow, with caption) · Code or config example (with language
note) · In practice · Local graph (live animated canvas of the term's immediate
neighbourhood, own outward pulse) · Quiz on this term · Further reading
(specifications, papers, primary sources) · Connected terms (every neighbour as a
domain-colour-coded chip). "Authored deeply for six terms (Kubernetes, Container,
Transformer, Zero Trust, Idempotency, RAG) in `deep-content.js`. Real, but thin."

### 8. Study and quizzes
Generated from the graph. Definition → pick the term; Relationship completion
("Kubernetes depends on …?"); Level placement (which layer of the stack, light
variant). **Distractor filtering:** wrong answers exclude anything taxonomically
joined to the correct term, or linked by `similar-to` or `alternative-to`, and are
drawn from the same domain so they stay plausible. (Encryption is filtered out as a
distractor against Symmetric Encryption.)

### 9. The three variants
| File | Direction | Distinct to it |
|---|---|---|
| **Atlas** | Light Modernist — flat, square corners, 2px rules, single red accent. | Stack view; hand-assigned levels, with a rail down the canvas; no axis toggle. |
| **Atlas Dark** | Dark Modernist — strict chrome, atmosphere confined to the canvas. | Glow strength and edge-flow tweak controls. |
| **Atlas Neon** | Reference-matched — navy ground, five saturated hues, glow, rounded cards. | Background motes; degree-sized glowing nodes; axis gizmo. |
Files: `Atlas.dc.html`, `Atlas Dark.dc.html`, `Atlas Neon.dc.html`,
`glossary-data.js`, `deep-content.js`.

### 10. Suggestions not yet built (raised in discussion, still open)  ·  [S5]
| Idea | Note |
|---|---|
| **Deep content for more terms** | Six of 109 are authored. Worth deciding how many should earn the full treatment. |
| **Per-term study tracking** | Record what you got wrong and resurface it — turns the quiz into revision. |
| **Dark's selection pulse** | Still the earlier breathing ring; should be brought in line with the outward-only treatment in the other two. |
| **Animated edges in the light variant** | Asked for, not yet built — Dark and Neon have it. Whether it should read from relationship type or be alias-only treatment in the other two. |
| **Node particle effects** | Discussed for the light variant; motes exist in Neon but not as per-node emitters. |
| **Deep-linkable terms** | A URL per term, so a definition can be linked and shared. |
| **Learning paths** | The `precedes` and `builds-on` edges already describe an order — it could be walked. |

---

## PART 2 — Proposed & candidate features (the other sources)

### [S4] Candidate future features
- Personalized learning paths based on known and unknown concepts.
- Prerequisite coverage for any target concept.
- Graph-based recommendations for what to learn next.
- Concept comparison pages.
- Common misconception detection.
- Relationship explanations generated or curated per edge.
- Interactive 3D graph with rotation, zoom, filtering and node selection.
- Graph traversal controls such as hop count.
- BFS / shortest-path style exploration exposed as user-facing graph queries.
- Domain and subdomain clusters.
- Cross-domain bridge discovery.
- Study questions tied directly to relationships and prerequisites.
- Learning progress overlays on the graph.

### [S3] Learning Features (with status)
| Feature | Status | Description |
|---|---|---|
| Prerequisite Cards | Recommended | Show what the learner should understand first and why. |
| Next Concepts | Recommended | Suggest natural follow-ons after the selected term. |
| Mini Curricula | Under Consideration | Turn a graph path into an ordered learning sequence. |
| Quizzes | Under Consideration | Small study questions attached to terms, paths, and comparisons. |
| Flashcards | Under Consideration | Spaced-repetition-friendly prompts from definitions and relationships. |
| Explain Using Known Concepts | Under Consideration | AI tutor adapts explanation based on terms the user already knows. |

### [S3] Core Product Areas (with status)
| Area | Status | Specification |
|---|---|---|
| Glossary | Decided | Clear primary page with concise definitions, layered explanations, key related concepts, prerequisites, examples, curated external resources. |
| Knowledge Graph | Decided | Terms modeled as nodes connected by typed edges, not unstructured related-term lists. |
| Learning System | Recommended | Prerequisites, next concepts, quiz questions, flashcards, learning paths. |
| Visualization | Decided | Include graph visualization, but do not make the 3D graph the default replacement for the term page. |
| Search | Decided | Support lexical, alias, semantic, and relationship-aware search. |
| AI Tutor | Under Consideration | Adaptive explanations later, grounded in the graph and evidence model. |

### [S1] Feature ideas raised in the long chat (checklist)
Multiple graph views (3D Galaxy / 2D Map / Hierarchy / Learning Path) · "Continue
learning" categorised external resources · source aggregation (resource +
type + depth) · "Why does this matter?" section · three layers of explanation
(Formal / Plain English / In practice) · "What do I need to know first?" · typed
relationships with `why` + `source` · normal term page ≠ 3D · rich graph
interactions ("1 relationship away", "Learn next") · "Show me the path" ·
Compare mode · `contrasts_with` as first-class ("Don't confuse these") · concept
maturity/status · terminology conflicts / disambiguation · AI tutor grounded in
the graph · keep Knowledge/Evidence/Presentation separate · progressive graph
loading · graph filters (relationship + domain) · 3D axis-mode selector · radial
distance for closeness · semantic gravity · BFS as an educational feature · expose
graph algorithms (Neighborhood/BFS/DFS/Shortest path/Dijkstra/Community/Centrality)
· prerequisite path · centrality node sizing · "How do I get from HTTP to
Kubernetes?" → "Learn this path" mini-curriculum.

### [S2] Feature ideas raised in the second chat (checklist)
Rich per-term semantic model · explicit typed relationships (14 types) · learning
paths as a first-class concept + "you understand 72% of prerequisites" +
recommended next concepts · abstraction levels as a partial ordering · 3D as an
exploration mode, not the primary nav · graph modes (Local / Dependency /
Hierarchy / Ecosystem / Compare) · "explain this concept through its neighbours" ·
difficulty as prerequisite-depth bars + concept-depth levels (Recognition →
Understanding → Application → Reasoning) · adaptive graph-generated quizzes (six
kinds) · personal knowledge graph (Know/Familiar/Learning/Don't understand) ·
"what should I learn next?" cross-domain paths · concept clusters · smarter
conceptual search · "show me the bridge" · first-class relationships with a "Why?"
explanation per edge · 3D "layers"/overlapping domain regions · query-driven graph
· the seven modes (LOOK UP / EXPLORE / UNDERSTAND / LEARN / VISUALIZE / COMPARE /
MAP).

### [S6] Lexicon — reserved-but-not-designed features
- **Study mode** — recall questions per Term in a sibling `<id>.quiz.yaml`; cloze
  deletion over the Summary, "which of these contrasts with X", "what must you know
  before X"; spaced repetition over a Cluster.
- **Path finder** — shortest conceptual route between any two Terms.
- **Compare view** — side by side, driven by `contrasts-with`.
- **"You are here."** — name three Terms you know, get a personalised entry point.
- **Coverage map** as a public page — honest about what is thin.

### [S7] Deep-research — "additional features" for a mature glossary site
Versioning & revisions (wiki-style diffs/rollback) · community contributions &
moderation (peer review, reputation/points, talk pages) · assessment analytics
(quiz performance, most-searched/most-quizzed dashboards) · spaced-repetition
scheduling · gamification (badges, streaks, progress bars) · discussion/comments
per term · internationalization · offline/export (CSV/PDF) · integration with
learning resources (per-term links to tutorials/books/courses). Full treatment in
`06_RESEARCH_OVERVIEW.md` §10.

---

## PART 3 — Feature status roll-up (from the sources that assign status)

Only [S3] and [S5] assign explicit statuses; combined here for convenience. This
is descriptive of the sources, not a decision.

| Feature | [S3] status | [S5] Atlas (built?) |
|---|---|---|
| Glossary / term pages | Decided | Built (index + panel + full page) |
| Typed knowledge graph | Decided | Built (178 edges, 17 types) |
| 3D graph | Decided (3D Galaxy) | Built (hand-rolled canvas) |
| 2D map | Recommended | — (canvas is 3D; Index is the 2D read) |
| Hierarchy view | Recommended | Partial (Stack / taxonomy-depth axis) |
| Learning path view | Recommended | Not built (edges exist; "could be walked") |
| Compare mode | Recommended | Built ("Confused" view) |
| Progressive loading | Decided | (focus dimming + neighbourhood) |
| Filters | Decided | Built (domain + link-type) |
| Search | Decided | Built (Index live search) |
| Semantic search | Decided (pgvector) | Not built |
| Quizzes | Under Consideration | Built (generated, scored) |
| Flashcards | Under Consideration | Not built |
| Spaced repetition | (V2/V3) | Not built (per-term tracking is a suggestion) |
| Personal knowledge map | (learning) | Not built |
| AI tutor | Under Consideration | Not built |
| Provenance / evidence UI | Decided (model) | Partial (Further reading) |
| Deep-linkable terms | — | Not built (a suggestion) |
