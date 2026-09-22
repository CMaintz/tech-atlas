# 03 — Technical Architecture

Purpose: storage, search, tech stack, the prototype decision plan, graph APIs, 3D
spatial lenses, graph algorithms, progressive loading, and implementation
patterns. The B-vision sources ([S1], [S3]) dominate here; the Lexicon ([S6]) and
Atlas ([S5]) positions are included where they take a different line. See the
divergence table in `00_README.md`.

---

## 1. Storage architecture tradeoffs

### [S3] Storage Architecture Tradeoffs (table)
| Option | Strengths | Weaknesses | Current recommendation |
|---|---|---|---|
| **PostgreSQL First** | Excellent for terms, definitions, sources, resources, users, progress, full-text search, embeddings with pgvector, and moderate graph relations. | Complex multi-hop graph queries can become awkward with recursive SQL and custom ranking. | Prototype first because it keeps the stack simple. |
| **OpenSearch Added** | Strong search specialization, hybrid keyword+vector retrieval, typo/relevance tooling. | Adds infrastructure, synchronization, operational cost, another query model. | Skip initially unless search requirements exceed PostgreSQL. |
| **Graph First With Neo4j** | Natural node/relationship/path model, graph algorithms, shortest paths, centrality, community detection, expressive traversal queries. | Adds a specialized database and may still need PostgreSQL for application content. | Prototype if the product identity is knowledge-graph-first. |
| **PostgreSQL + Graph Extension** | Potential middle ground that keeps one database while adding graph concepts. | Developer experience and ecosystem should be benchmarked before choosing. | Evaluate only if it looks materially simpler than Neo4j. |
| **PostgreSQL + Neo4j** | Best separation of content/application data from graph traversal and algorithms. | Two databases require sync, migrations, backups, consistency rules, more infrastructure. | Do not start here unless prototypes prove the need. |

### [S1] The database reasoning (evolves across the session)
The session revises its own recommendation twice — preserved in order:

**First position ("I wouldn't start with Neo4j"):** "Don't let the visualization
dictate your database." The primary data (Terms, Definitions, Sources, Categories,
Questions, Resources, Users, Progress, Relations) "is a perfectly comfortable
relational model", and PostgreSQL's recursive queries already handle
hierarchical/tree-like traversal. Represent `term / relation / term` in PostgreSQL
and generate `{nodes, links}` for the visualization. "If you eventually discover
that you're doing enormous multi-hop graph queries constantly, *then* evaluate
Neo4j… I'd avoid paying that complexity tax prematurely."

**Revised position ("I'd at least seriously consider a graph database from day
one"):** "Because your project isn't merely 'A website containing terms.' It's
becoming **A knowledge graph with a glossary UI.**" PostgreSQL is excellent for
the *content* (relational entities + FTS via tsvector/tsquery + pgvector with
HNSW/IVFFlat + hybrid search). Where PostgreSQL gets awkward is the graph: e.g.
"Find all paths between Docker and Kubernetes up to depth 6, where only
prerequisite, part_of, implements and builds_on relationships are allowed, rank
the paths by relationship weights, and return the five most useful paths." In
Neo4j the abstraction is literally `(nodes)-[relationships]->(nodes)` and Cypher
is designed to query those patterns; Neo4j GDS provides BFS, DFS, Dijkstra, A*,
centrality, community detection, shortest paths built in.

**Third option (hybrid Postgres + Neo4j with sync):** Postgres for
content/users/sources/definitions/learning/embeddings; Neo4j for the knowledge
graph, traversals, algorithms, paths, communities — but "I wouldn't start there
either" because two databases means sync, double migrations, two backup
strategies, two query models, consistency problems, more infrastructure.

**Fourth option (Postgres + graph extension, e.g. Apache AGE):** retain PostgreSQL
but add graph model/querying via an extension. "Treat that as something to
benchmark rather than automatically choosing it. The ecosystem and developer
experience aren't as straightforward as simply using Neo4j."

**Decision heuristic [S1]:** base the choice on the intended **core product
identity**. If it's "a really good technical glossary with some graph
visualization" → **PostgreSQL + pgvector**, keep relationships relational. If it's
"a technical knowledge graph that happens to provide glossary pages" → **Neo4j +
perhaps Postgres**, or Neo4j as the primary knowledge store. "And from everything
you've described so far… I think you're drifting toward the second one."

### [S6] Lexicon position — no database at launch
Content is authored as files (Term frontmatter + optional Article files); phase 1
"produces a JSON graph either way", and the framework choice (Astro or Next) is
"not urgent". Persistence is a static build artifact, not a running database.

### [S5] Atlas position — no database
Data lives in `glossary-data.js`; the demo is a static client-side app with a
hand-built canvas renderer and no backend.

---

## 2. Search architecture

### [S3] Search Architecture (Decided)
Users should be able to search by exact term, typo, abbreviation, plain-language
description, and relationship intent.

| Search type | Example query | Expected result |
|---|---|---|
| Lexical | `kubernets` | Kubernetes with typo tolerance/correction. |
| Alias | `OIDC` | OpenID Connect. |
| Semantic | `software for managing containers across many servers` | Kubernetes, container orchestration, related alternatives. |
| Relationship-aware | `things related to Kubernetes` | Pod, Deployment, Service, Helm, Container, Cluster. |
| Compare intent | `Docker vs Kubernetes` | Compare page plus graph relationship. |
| Path intent | `How are Docker and Kubernetes related` | Highlighted path and explanation. |

**Recommended starting point [S3]:** PostgreSQL full-text search plus pgvector for
semantic search and hybrid ranking. Add a dedicated engine such as OpenSearch only
when actual data scale, query latency, ranking quality, or operational needs
justify it.

### [S1] "Search is where I'd spend more money/attention"
"This is actually more important than the database." Someone typing `what is a
container` should get **Container — 97% match**, not an exact-string search.
Wanted: lexical (`kubernets → Kubernetes`), alias (`OIDC → OpenID Connect`),
semantic (`technology for running containers across many servers → Kubernetes,
container orchestration, Docker Swarm`), and relationship-aware (`things related to
Kubernetes → Pod, Deployment, Service, Helm, Container, Cluster`).

Tooling notes [S1]:
- OpenSearch supports hybrid lexical + semantic/vector ranking — "particularly
  appropriate for this kind of search."
- For a smaller MVP, **Postgres + Meilisearch** is reasonable — typo tolerance and
  configurable search out of the box.
- Postgres FTS (tsvector/tsquery, ranking, phrase search, synonym/thesaurus) +
  pgvector (HNSW/IVFFlat, hybrid search) can be a "surprisingly complete starting
  point"; "for a glossary with perhaps tens or hundreds of thousands of terms
  rather than billions of documents, I'd strongly consider keeping it simple."
- Initially **skip OpenSearch**; move search there later if scale/relevance justify.

### [S4] Intelligent search and exploration
Search should eventually accept conceptual questions, not only exact lookups:
"What's the difference between containers and VMs?" · "What do I need to know
before Kubernetes?" · "What concepts are related to OAuth?" · "Show me everything
between TCP and HTTP." · "What technologies implement service discovery?" · "What
concepts am I missing for understanding CI/CD?"

### [S2] Smarter search
Same conceptual-question examples. "That turns the glossary into an exploration
engine."

---

## 3. Proposed tech stack

### [S3] Proposed Tech Stack (table)
| Layer | Recommendation | Reasoning |
|---|---|---|
| Frontend | Next.js, React, TypeScript. | Boring, capable, fast to build, suitable for content + interactive views. |
| UI | Tailwind and shadcn/ui. | Good component velocity with a restrained interface. |
| Data Fetching | TanStack Query where appropriate. | Handles caching and async state for graph/search. |
| Backend | Next.js server actions or API routes for MVP. Consider ASP.NET Core, FastAPI, or NestJS if separation becomes important. | Keep initial stack simple while preserving an escape hatch. |
| Database | PostgreSQL with pgvector for first prototype. | Relational data, full-text search, embeddings, initial relations. |
| Graph Database | Neo4j for graph-first prototype. | Best candidate for typed graph traversal and algorithms. |
| 3D Graph | 3d-force-graph with Three.js or React bindings. | Aligned with interactive force-directed 3D graph needs. |
| 2D Graph | React Flow for structured diagrams and interactive node interfaces. | Good for controlled 2D maps, custom nodes, panning, zooming, selections. |
| Search | PostgreSQL full-text search plus pgvector initially. | Avoid OpenSearch until needed. |

### [S1] "Tech stack: I'd keep it relatively boring"
- **Frontend:** Next.js + React + TypeScript, with Tailwind, shadcn/ui, React
  Query / TanStack Query. "You don't need anything exotic."
- **Backend:** Next.js API routes / server actions + PostgreSQL, or a small
  separate ASP.NET Core / FastAPI / NestJS if you want an explicitly separated
  backend.
- **3D graph:** **3d-force-graph** (Three.js/WebGL, force-directed 3D, directional
  arrows, curved links, node labels, thousands of elements, React bindings) —
  "almost suspiciously aligned with your use case."
- **2D graph:** **React Flow** (dragging, zooming, panning, selection, custom
  nodes, minimaps, controls), "although… more suited to structured
  diagrams/editors than massive knowledge graphs."

### [S6] Lexicon — framework
"Astro or Next" — undecided. "Astro suits a content site with an interactive
island; Next is one framework for everything. Not urgent — phase 1 produces a JSON
graph either way."

### [S5] Atlas — as built
Vanilla HTML/JS; a hand-built canvas force renderer (no external graph library);
data in `glossary-data.js`; deep content in `deep-content.js`; a `_ds/` modernist
design-system bundle. Three variants (see `09_VISUAL_DIRECTION.md`).

---

## 4. Prototype decision plan

### [S3] Prototype Decision Plan (Recommended)
Before committing to the persistence architecture, build two small prototypes
against the same five queries, comparing implementation clarity, query
performance, data-modeling friction, and product fit.

| Prototype | Stack | Purpose |
|---|---|---|
| **A. PostgreSQL-First** | Next.js, PostgreSQL, full-text search, pgvector, `term_relations` table, Three.js or 3d-force-graph. | Test whether one database comfortably supports the product through V1 and V2. |
| **B. Graph-First** | Next.js, PostgreSQL for content/users, Neo4j for knowledge graph and algorithms, graph rendering client. | Test whether graph queries and algorithms are dramatically cleaner and worth the added complexity. |

**The five queries [S3]:**
1. Direct neighbors for a selected term.
2. N-hop neighborhood with relationship filters.
3. Breadth-first search expansion and traversal ordering.
4. Shortest path between two concepts with relationship constraints.
5. Prerequisite path and learning-path generation.

### [S1] The same two-variant prototype recommendation
**A. PostgreSQL-first:** Next.js → PostgreSQL (content, relations, FTS, pgvector) →
Three.js / 3d-force-graph. **B. Graph-first:** Next.js → PostgreSQL
(application/content data) + Neo4j (knowledge graph + GDS) → Three.js /
3d-force-graph. Implement the same five queries in both: direct neighbors, N-hop
neighborhood, BFS, shortest path, prerequisite path. "If the graph-first version
is dramatically cleaner, use Neo4j. If Postgres is perfectly comfortable, you've
saved yourself a database." For search, initially skip OpenSearch.

> [S1] "I think we should consider the graph database decision *before* we lock the
> domain model, because the exact way we model relationship types, weights,
> provenance, prerequisites and inferred relationships will have a huge effect on
> how powerful this thing can ultimately become."

---

## 5. Graph API shapes  ·  [S3]

```
GET /api/terms/kubernetes
GET /api/terms/kubernetes/graph?depth=2&relations=prerequisite,part_of,commonly_used_with
GET /api/graph/path?from=docker&to=kubernetes&mode=shortest
GET /api/graph/path?to=kubernetes&mode=prerequisite
GET /api/search?q=software%20for%20managing%20containers%20across%20many%20servers
GET /api/compare?terms=docker,kubernetes
```

---

## 6. Graph visualization architecture

### [S3] Graph Visualization (Decided)
The visualization should be functional, not decorative. It should help users
explore neighborhoods, see clusters, understand paths, filter relationship types,
and learn graph concepts such as breadth-first search and shortest paths.

| View | Status | Purpose |
|---|---|---|
| 3D Galaxy | Decided | Immersive exploration, clusters, unexpected connections, spatial lenses. |
| 2D Map | Recommended | Primary serious learning view — clear relationships, zooming, panning, structured exploration. |
| Hierarchy | Recommended | Tree-oriented taxonomy for broader/narrower concepts. |
| Learning Path | Recommended | Ordered prerequisite and next-concept sequence. |
| Compare Graph | Under Consideration | Relationship-focused view of shared ancestors, contrasts, alternatives, differentiators. |

### [S1] Multiple graph views (view switcher)
- **3D Galaxy** — the visually impressive one; great for exploration, discovering
  unexpected connections, seeing clusters, "wandering", understanding domain
  intersections. Clicking Kubernetes pulls the camera toward it and reveals its
  neighbourhood.
- **2D Map** — "much more practical… probably the primary serious learning view."
- **Hierarchy** — a tree (CS → Software Engineering → {Architecture, Design
  Patterns, Testing}; Systems → {OS, Networking}; Algorithms → {Sorting, Graph}).
- **Learning Path** — a recommended sequence, "not necessarily a taxonomy."

### [S1] Graph interactions on click (the exploration payoff)
Clicking a node should surface its position and next steps, not just select it.
Example [S1]: click **Kubernetes** → **Explore**; the graph expands; click **Pod**
and the UI says:
> "Pod is a **fundamental Kubernetes abstraction**. You are currently **1
> relationship away** from Kubernetes. Learn next: Container → Pod → Deployment."
Plus **"Show me the path"** (`Docker → Kubernetes` highlights Docker → Container →
Container orchestration → Kubernetes) and **"How are Docker and Kubernetes
related?"** producing the path. "That's where the knowledge graph becomes
substantially more than eye candy."

### [S4] 3D visualization modes
- **Local graph** — a selected concept and its 1–2 hop neighbourhood.
- **Dependency graph** — prerequisites and dependants.
- **Conceptual hierarchy** — parent/child and abstraction relationships.
- **Ecosystem graph** — technologies surrounding a platform or domain.
- **Compare mode** — the conceptual relationship between two terms.
- **Bridge mode** — the path connecting two concepts.
- **Learning graph** — overlay the user's knowledge state on the conceptual graph.

> [S4] The graph should be query-driven; a graph of thousands of nodes/edges
> becomes a visual hairball. Render small, purposeful subgraphs and let users
> expand them.

### [S2] Different graph modes
Local graph (1–2 hops) · Dependency graph (prerequisites only) · Conceptual
hierarchy (parent/child abstraction) · Ecosystem graph (Kubernetes → Helm, ArgoCD,
Istio, Prometheus, Containerd, CNI, CSI, Operators) · Compare mode (VM vs
Container). "3D graph ≠ useful graph. A thousand nodes connected by 4,000 lines
looks spectacular for about 30 seconds and then becomes useless." Make the
visualization **query-driven**.

### [S6] The graph (Lexicon)
A persistent sidebar showing the current Term's **Neighbourhood**, expandable to
fullscreen; always present, never the only route to content.
- **2D is the default.** Readable labels, precise clicking, works on a phone.
- **3D is a mode**, not the front door — it earns its place only because the
  vertical axis means something: **Depth**, computed from `requires` (ADR-0001).
  The result is a layered dependency graph with foundations at the bottom — "the
  one 3D form that reads."
- Edge Type drives colour; Cluster drives grouping; Domain drives filtering;
  `status` and `era` drive the optional history view.
- Every node is a link to a real, statically rendered page. "The canvas is an
  index, not a container."

### [S5] Atlas — the 3D graph as built
Hand-built canvas renderer; force-directed layout solved once at load, then each
frame projected from the cached 3D frame. No external graph library. Rendering
mechanics (layout formula, node size, colour, selection pivot/pulse, edge
animation/styling, focus dimming, auto-fit camera, label placement, background
motes, controls) are captured in `09_VISUAL_DIRECTION.md` §Atlas graph mechanics.

---

## 7. Progressive loading

### [S3] Progressive Loading (Decided)
Do not render the whole graph when a user opens a term. Start with the focal node
and direct relationships. Let the user increase depth or add layers.

| Depth | Meaning | Use |
|---|---|---|
| 0 | The selected term only. | Anchor the view and term summary. |
| 1 | Direct relationships. | Default graph neighborhood. |
| 2 | Relationships of direct neighbors. | Show nearby conceptual context. |
| 3+ | Further expansion. | Use selectively with filters and performance safeguards. |

### [S1] "I'd make the graph progressively load"
"Do not render 15,000 terms + 40,000 relationships when someone opens Kubernetes."
Start with the focal node's direct neighbours, then "**+ Explore further**" adds
another layer. Depth 1 = direct relationships; Depth 2 = relationships of
relationships; etc. "That keeps the visualization comprehensible and performant."

---

## 8. Filters

### [S3] Filters
- Filter by relationship type (prerequisites, related concepts, is-a, part-of,
  tools, standards, learning resources).
- Filter by domain (platform engineering, cloud, AI, cybersecurity, software
  engineering, computer science).
- Filter by difficulty, maturity, confidence, evidence quality, editorial status.
- Allow strong relationships only, prerequisites only, architecture only, or
  learning relationships only.

### [S1] Graph filters (checkbox mockup)
Relationship filters: ☑ Prerequisites ☑ Related concepts ☑ Is-a/hierarchy ☑
Part-of ☐ Tools ☐ Companies ☐ Standards ☐ Learning resources. Domain filters: ☑
Platform Engineering ☑ Cloud ☐ AI ☐ Cybersecurity ☐ Computer Science. "Show only
prerequisites" collapses Kubernetes to Linux → Networking → Containers → Container
orchestration → Kubernetes.

---

## 9. Three-dimensional spatial lenses

### [S3] Three Dimensional Spatial Lenses (Decided)
TechLexicon should **not** store one permanent x/y/z coordinate per term.
Coordinates should be derived from the selected visualization lens.

| Lens | X axis | Y axis | Z axis | Notes |
|---|---|---|---|---|
| Relationship | Force layout / cluster position | Force layout / cluster position | Hop distance from focal term | Good default exploration mode. |
| Abstraction | Domain / conceptual dimension | Abstraction level | Relationship distance | Makes high-level and implementation concepts visually distinct. |
| Learning | Prerequisite progression | Difficulty | Conceptual distance | Useful for curriculum generation. |
| Architecture | System layer | Abstraction | Dependency depth | Useful for platform/software architecture domains. |
| Complexity | Configurable | Estimated learning complexity | Relationship distance | Treat as editorial/derived, not objective truth. |

**Recommendation [S3]:** Use radial or hop distance for relationship closeness
rather than making relationship strength a permanent axis. Directly connected
concepts should appear close to the focal node; nodes two/three hops away farther
out unless a selected lens intentionally changes that projection.

### [S1] "I'd change how we think about the 3D coordinates"
"**Don't store one permanent (x,y,z) for every term.**" Coordinates are derived
from the selected visualization mode:
- **Lens: Relationship** — X/Y arbitrary graph layout, Z = hop distance.
- **Lens: Abstraction** — X = domain, Y = abstraction level, Z = relationship
  distance.
- **Lens: Learning** — X = prerequisite progression, Y = difficulty, Z =
  conceptual distance.
- **Lens: Architecture** — X = layer, Y = abstraction, Z = dependency depth.

**Spatial lenses (named) [S1]:** Abstraction (fundamental ←→ high-level); Learning
level (Beginner → Intermediate → Advanced → Expert); Implementation proximity
(theory ←→ implementation); Domain (CS ← SE ← Platform ← AI ← Security);
Relationship distance (direct near, distant far); Complexity ("an editorial/derived
score rather than an intrinsic property").

**Do NOT [S1]:** make `X = complexity, Y = abstraction, Z = relationship strength`
the permanent canonical representation — "you're implying that all three have
objective numerical values. They don't." Compute an **Estimated learning
complexity** from difficulty rating + number of prerequisites + number of related
concepts + depth of dependency tree + definition complexity + domain — "rather
than pretending that Kubernetes has objectively '7.3 complexity'."

**Radial distance, not an XYZ axis, for closeness [S1]:** distance from the focal
node = graph distance (0 = Kubernetes, 1 = directly connected, 2/3 = hops away).
"You could literally have Graph depth: 2 and see the graph expand in concentric
layers." Related idea: **"semantic gravity"** — the selected term becomes the
gravitational centre; direct relationships orbit close; second-degree concepts
move farther out; relationship weighting (all / strong only / prerequisites only /
architecture only / learning only) reshapes the neighborhood.

### [S4] 3D axes and spatial encoding
X/Y/Z could encode abstraction, conceptual depth, complexity, or relationship
distance — but only where the semantics are defensible. "A promising approach is to
make spatial dimensions configurable rather than permanently hard-coded." Toggles:
abstraction, complexity, conceptual depth, relationship distance, domain, learning
state. "The same underlying graph could therefore be viewed through different
analytical lenses."

### [S2] 3D "layers" and overlapping domain regions
Imagine the technical universe as a 3D landscape (Hardware → OS/Runtime →
Infrastructure/Cloud → Frameworks/Platforms → Architecture/Patterns →
Application). Terms occupy positions by conceptual relationship; clusters of
knowledge become visible (AI in one region, Security another, Platform another,
overlapping around Cloud). "'Why does cybersecurity overlap with platform
engineering?' becomes visually obvious."

### [S5] Atlas — the vertical axis (what the demo settled on)
The hand-assigned abstraction levels (`level` 1–5) "were well placed: they read
below. But four options were weighed; the resolution is to **derive** the axis
instead of assigning it." Two live toggles ship in Dark and Neon:
- **Taxonomy depth** — height is distance along `is-a` / `part-of` chains to a
  root. General above, specific below. Derived from the edges, so it cannot
  contradict the data.
- **Free layout** — no vertical meaning; pure force. Clusters read as domains.
  Default in Neon.
The light variant's Stack view keeps the original hand-assigned levels.

### [S6] Lexicon — Depth (the same problem, resolved by derivation)
See ADR-0001. `depth(t) = 0` if `t` requires nothing, else
`1 + max(depth(r) for r in requires(t))`. "The `requires` Edge becomes
load-bearing… an author being lazy about prerequisites visibly flattens the graph."
`layer` survives as an optional, per-Domain, purely categorical facet.

---

## 10. Graph algorithms as user-facing features

### [S3] Graph Algorithms And Exploration (Decided)
| Algorithm / Mode | User-facing behavior | Implementation notes |
|---|---|---|
| Neighborhood | Show direct neighbors and relationship labels. | Depth-1 query with filters and relation weights. |
| Breadth First Search | Animate layer-by-layer expansion from a selected term. | Natural match for hop distance and frontier visualization. |
| Depth First Search | Show deep chains and dependency branches. | Useful for explaining traversal; less useful as default browsing. |
| Shortest Path | Answer how two concepts are connected. | Support allowed relation types and weighted ranking. |
| Prerequisite Path | Answer what to learn before this. | Traverse prerequisite and builds-on relationships. |
| Dijkstra | Find lowest-cost weighted path. | Useful when relation weights represent learning effort/strength. |
| Centrality | Show most connected/influential concepts. | Can size nodes by centrality in a selected domain. |
| Community Detection | Reveal clusters of related concepts. | Useful for domain maps and curriculum grouping. |

**Path-based learning [S3]:** "How do I get from HTTP to Kubernetes?" → identify
both nodes, compute relevant paths, highlight, explain each transition, convert to
a mini curriculum. Same mechanism supports Docker→Kubernetes, Linux→containers,
authentication→authorization.

### [S1] Exposing the graph algorithms
An "Explore algorithm" selector: Neighborhood · BFS · DFS · Shortest path ·
Dijkstra · Community detection · Centrality.
- **BFS** as an *educational* feature — "Explore Kubernetes using Breadth-First
  Search"; animate the frontier expanding (Layer 0: Kubernetes; Layer 1: Pod ·
  Container · Cluster · Service · Deployment; Layer 2: Container Image · Node ·
  ReplicaSet · Ingress · …). Neo4j GDS returns traversal order and supports max
  depth and target termination.
- **Shortest path** — "How are Docker and Kubernetes connected?" → Docker →
  Container → Containerization → Container orchestration → Kubernetes.
- **Prerequisite path** — "What should I learn before Kubernetes?" → Linux →
  Processes → Containers → Container orchestration → Kubernetes.
- **Centrality** — "Which concepts are most important/connected in Platform
  Engineering?" → increase node size by centrality.

### [S4] Graph algorithms as user features
"Breadth-first search naturally supports 'show concepts within N relationships'."
Also shortest conceptual paths, prerequisite traversal, neighbourhood exploration,
bridge finding.

### [S2] Show me the bridge
Finding a conceptual path between two selected concepts. `Machine Learning →
Kubernetes` → ML workloads → Model serving → Containers → Container orchestration →
Kubernetes. `Python → LLMs` → Libraries → Machine Learning → Neural Networks →
Transformers → Large Language Models. "The graph becomes a way of answering 'How
are these two things connected?' — something ordinary glossaries are terrible at."

### [S1] The killer combination
"How do I get from HTTP to Kubernetes?" → identify the two nodes → calculate paths
→ show the graph → highlight the shortest/relevant path → explain each transition →
**"Learn this path"** generates a mini curriculum from the path. "That's where your
glossary, graph database, visualization and learning system all become one coherent
product."

### [S6] Lexicon — Path (reserved)
"An ordered walk through `requires` Edges — either everything needed before a Term,
or the conceptual route between two Terms." **Path finder** (shortest conceptual
route between any two Terms) is reserved for a later phase.

---

## 11. Implementation patterns  ·  [S3]

- Keep the domain model separate from visualization coordinates. Coordinates are
  projections generated per lens.
- Expose graph data through explicit APIs returning nodes, links, relation
  metadata, and summary cards.
- Use relation weights and confidence scores, but make editorial meaning clear in
  the UI.
- Store provenance for definitions and relations from the beginning, even if the
  first UI shows it lightly.
- Design graph queries around use cases rather than around the rendering library.
- Cache graph neighborhoods and search results for popular terms.
- Use progressive graph loading to protect performance and comprehension.
- Treat AI-generated explanations as presentation drafts grounded in structured
  knowledge and evidence.
- Keep relation-type naming stable because it will affect search, UI labels,
  analytics, and graph algorithms.

---

## 12. MVP architecture diagrams

### [S1] Rough MVP architecture
```
                    ┌─────────────────┐
                    │     Next.js     │
                    │  React + TS     │
                    └────────┬────────┘
                 ┌───────────┴───────────┐
             Term UI                 Graph UI
                 │                 3D Force Graph / React Flow
                 └───────────┬───────────┘
                         API layer
                   ┌─────────┴─────────┐
              PostgreSQL          Search (Meilisearch /
                   │               later: OpenSearch)
          ┌────────┴────────┐
       Terms │ Relations │ Sources │ Learning │ Resources │ Questions
```
> [S1] "Don't introduce an AI/vector database/Neo4j/Kafka/etc. just because the
> architecture diagram looks cooler with them. Start simple."

### [S1] Revised architecture recommendation (two variants)
```
A. PostgreSQL-first          B. Graph-first
Next.js                      Next.js
 ├── PostgreSQL               ├── PostgreSQL (application/content data)
 │    ├── content             ├── Neo4j (knowledge graph + GDS)
 │    ├── relations           └── Three.js / 3d-force-graph
 │    ├── FTS
 │    └── pgvector
 └── Three.js / 3d-force-graph
```

---

## 13. AI tutor (constrained)

### [S1] "Explain this concept to me" — AI tutor on top of the graph
Add an AI tutor **on top of** the structured graph, not as the source of truth.
"Explain Kubernetes to me as if I know Docker but not Kubernetes." The system knows
what the user knows (Docker ✓, Containers ✓, Linux ✓) and doesn't (Kubernetes ✗,
Pod ✗, Deployment ✗, Service ✗), then generates an explanation grounded in the
graph. "Explain Kubernetes using only concepts I already know."

### [S3] AI Tutor (Under Consideration)
"Add adaptive explanations later, grounded in the graph and evidence model rather
than using AI as the source of truth." Open question [S3]: "The tutor must not
override the evidence model or invent facts. Design grounding, citation, and
refusal rules before implementation." See `07_DECISIONS_AND_OPEN_QUESTIONS.md`.

### [S2] "Explain this concept through its neighbours"
Service Mesh → "You already know: Microservices, HTTP, Networking. This concept
introduces: Sidecars, Traffic management, mTLS, Service-to-service observability.
Often confused with: API Gateway. Builds on: Service discovery, Distributed
systems." "That's much more educational than a traditional dictionary entry."
