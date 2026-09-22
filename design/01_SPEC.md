# 01 — Product & Feature Specification

Purpose: the product vision, positioning, audiences, product model, term-page UX,
and the content model. Where sources overlap, both are shown with provenance
(see `00_README.md` for the key). Nothing is reconciled here.

---

## 1. Product vision

### [S3] TechLexicon Product & Architecture Spec — Product Vision (status: **Decided**)
TechLexicon should not be a flat dictionary of technical terms. It should combine
a concise glossary, a typed knowledge graph, and a learning layer. A term page
explains the concept, the graph shows how it relates to other concepts, and
learning features help users decide what to learn first and what to learn next.

- Provide clear explanations for technical terms across computer science, software
  engineering, platform engineering, artificial intelligence, and cybersecurity.
- Represent terms as entities in a semantic network rather than isolated entries.
- Use typed relationships so the graph can explain why concepts are connected.
- Use external resources as the depth layer, while TechLexicon owns the
  conceptual and navigational layer.
- Support exploration, comparison, prerequisites, ambiguity handling, and
  learning paths.

**Current architectural conclusion [S3].** The project should be treated as a
glossary, knowledge graph, and learning system. The current recommendation is to
prototype both a PostgreSQL-first version and a graph-first version before
committing to the persistence architecture. Search should start PostgreSQL-first
with full-text search and pgvector unless scale or relevance needs later justify
OpenSearch.

### [S4] Product Development Document — Product Vision
The project should be treated as more than a dictionary or glossary. The central
idea is an interactive map of technical knowledge covering areas such as computer
science, software engineering, platform engineering, AI and cybersecurity.

A traditional glossary answers: "What does Kubernetes mean?" The proposed product
should also answer: "Where does Kubernetes fit, what concepts do I need to
understand first, what concepts build on it, how is it related to neighbouring
concepts, and can I demonstrate that I understand it?"

The glossary is therefore the atomic layer; relationships form the knowledge
graph; quizzes and learning paths form the learning layer; and the 3D
visualization provides a spatial interface to the graph.

### [S1] Chat session — the framing
"Glossary + Knowledge Graph + Learning System." A term isn't just `Kubernetes →
definition`; it's an entity in a semantic network, and the edges should have
*meaning* (`commonly_used_with`, `manages`, `contains`, `runs`, `built_from`,
`prerequisite`) rather than a bare `Kubernetes ─── Docker` link. The combination
the author is most excited about "isn't 'dictionary with a cool 3D graph.' It's:
**A technical knowledge map that happens to contain a dictionary.**" The
dictionary answers *"What is this?"*, the graph answers *"How does it fit into
everything else?"*, the learning system answers *"What should I learn next?"*, and
the external resources answer *"Where can I go deeper?"*

### [S2] Other chat session — the framing
"I would **not** treat it as 'a dictionary with some extra features.' I'd treat it
as a **navigable knowledge graph for technical concepts**." A normal glossary
answers "What does Kubernetes mean?"; this version answers "What is Kubernetes,
where does it sit in the broader technical landscape, what concepts do I need to
understand before it, what concepts build on it, and can I actually demonstrate
that I understand it?"

### [S6] Lexicon (techlexicon/docs/spec.md) — What it is
> A dictionary of computer science, software engineering, cybersecurity, AI and
> platform engineering in which the relationships between concepts are authored
> data, not prose hyperlinks — so the whole vocabulary can be read as a graph,
> walked as a learning path, and searched as a reference.

(Status per S6: "draft, nothing built.")

---

## 2. Product positioning

### [S1]
Not "Wikipedia for technical terms." Better understood as an **interactive map of
technical knowledge**. The dictionary provides the atomic concepts; the graph
explains how concepts fit together; learning features help users acquire missing
knowledge; visualization makes the structure explorable. "Your site provides the
conceptual layer; external resources provide the depth layer" — so the glossary
becomes "a launchpad into the ecosystem of knowledge, rather than competing with
every educational website on the Internet."

### [S2]
"The strongest version of this isn't Wikipedia for technical terms — there are
already plenty of resources for definitions. It's more like an interactive map of
technical knowledge, where the dictionary is the atomic layer, the relationships
form the knowledge graph, and the quizzes/learning paths form the learning layer."
The 3D visualization becomes the visual interface to the knowledge graph, rather
than a gimmick bolted onto a glossary.

### [S3] Product Positioning (Decided baseline)
See §Current baseline decisions in `07_DECISIONS_AND_OPEN_QUESTIONS.md`.

### [S4] One-sentence product definition
> An interactive technical knowledge platform where concepts are defined,
> connected, visualized and taught as a navigable knowledge graph.

---

## 3. Who it is for (audiences)

### [S6] Lexicon — Who it is for (ranked deliberately)
1. **Someone mid-task who hit a word they don't know.** Needs the Summary in under
   five seconds from a Google result. This user never sees the graph and must
   still be served perfectly.
2. **Someone studying a syllabus** — the immediate case is a cybersecurity course.
   Needs lookup, needs to know what a term contrasts with and what it presupposes,
   and later needs to test recall.
3. **Someone with a shape-of-the-field question.** "Where does this sit, what's
   next to it, what do I need first?" This is the user the graph exists for.

> "Ranked deliberately. The graph is the differentiator but it is not the primary
> use." [S6]

*(The B-vision sources [S1–S4] do not rank audiences explicitly; they describe the
same three needs — fast lookup, guided study, shape-of-the-field exploration —
through the product "modes" in §4.)*

---

## 4. Core product model / modes

### [S4] Core Product Model
- **LOOK UP** — Find and understand a specific technical term.
- **EXPLORE** — Navigate related concepts and technical neighbourhoods.
- **UNDERSTAND** — Build context through prerequisites, neighbouring concepts and
  explanations.
- **LEARN** — Use quizzes, study questions and learning paths.
- **VISUALIZE** — Explore relationships through an interactive graph, including 3D.
- **COMPARE** — Compare related or commonly confused concepts.
- **MAP** — Track personal understanding and identify useful next concepts.

### [S2] The seven modes (with example queries)
- **LOOK UP** — Traditional glossary. "What is OAuth?"
- **EXPLORE** — Navigate related concepts. "What is around OAuth?"
- **UNDERSTAND** — Build conceptual context. "What do I need to understand OAuth?"
- **LEARN** — Quizzes and learning paths. "Teach me OAuth."
- **VISUALIZE** — Interactive knowledge graph. "Show me how OAuth relates to
  authentication."
- **COMPARE** — Side-by-side concepts. "OAuth vs API keys vs JWT."
- **MAP** — Personal knowledge map. "What do I know and what should I learn next?"

> "That gives the site a very clear identity." [S2]

### [S6] Two reading modes by construction
"Look it up (Summary, seconds) and learn it (Body then Article, minutes to an
hour)." (ADR-0004.)

---

## 5. Term-page UX and information architecture

### [S3] Term Page UX (Decided)
The normal term page should be the primary learning surface. The graph should be
available through exploration actions rather than taking over the page. This keeps
the glossary useful for fast lookup while preserving the richer graph interactions
for users who want to explore.

**Term Page Structure [S3]:**
- Title, domain tags, maturity status, and difficulty level.
- A concise formal definition.
- A plain English explanation.
- A practical explanation showing how the concept appears in real systems.
- A "why it matters" section.
- Key related concepts with typed relationship labels.
- Prerequisites and next concepts.
- Compare / "do not confuse" section for commonly confused terms.
- "Continue learning" links grouped by resource type.
- "Explore connections" action that opens the graph view centered on the term.

### [S4] Term Page — Proposed Information Architecture
- Term name and aliases
- Short definition
- Simple explanation
- Technical explanation
- Prerequisites / "You should understand"
- Neighbouring concepts / "You might also know"
- Concept map
- Explore in 3D action
- Test yourself action
- Examples and practical context
- Common misconceptions
- Comparisons
- History / deeper context
- Related resources

**[S4] Example concept page:**
> Kubernetes
> Simple explanation: Kubernetes helps manage containers across machines.
> Prerequisites: Containers, Networking, Distributed Systems.
> Neighbouring concepts: Docker, Linux, Cloud.
> Related concepts: Pods, Services, Deployments, Service Discovery.
> Actions: Explore in 3D; Test yourself.

### [S1] "Don't make the 3D graph the default term page"
The normal term page mockup [S1]:
```
┌──────────────────────────────────────────┐
│ Kubernetes                               │
│ Container orchestration                  │
│ [Beginner] [Platform Engineering]        │
│ Definition   ──────────                  │
│ In simple terms   ...                    │
│ Why it matters    ...                    │
│ Key concepts  [Container] [Pod] [Cluster]│
│ ┌──────────────────────────────────────┐ │
│ │ What should I learn first?           │ │
│ │ Container → Docker → ...             │ │
│ └──────────────────────────────────────┘ │
│ Continue learning →                      │
└──────────────────────────────────────────┘
```
Then **"Explore connections →"** opens the graph. "That prevents the graph from
getting in the way of the actual glossary."

### [S2] Term-page mockup (the "killer UI concept")
```
┌──────────────────────────────────────────────────────┐
│ Kubernetes                                           │
│ /kuːbərˈnetɪs/                                       │
│ Container orchestration platform                     │
│ ─────────────────────────────────────────────────── │
│ IN SIMPLE TERMS                                      │
│ Kubernetes helps manage containers across machines.  │
│ ┌──────────────┐    ┌─────────────────────────────┐  │
│ │ PREREQUISITES│    │ YOU MIGHT ALSO KNOW         │  │
│ │ Containers   │    │ Docker                      │  │
│ │ Networking   │    │ Linux                       │  │
│ │ Distributed  │    │ Cloud                       │  │
│ └──────────────┘    └─────────────────────────────┘  │
│ CONCEPT MAP                                          │
│              Containers                              │
│                   ▼                                  │
│             Kubernetes ──── Networking               │
│             ┌─────┼─────┐                            │
│            Pod  Service Deployment                   │
│ [ Explore in 3D ]     [ Test yourself ]             │
│ ─────────────────────────────────────────────────── │
│ DEEPER: Architecture • Examples • Misconceptions •   │
│         History                                      │
└──────────────────────────────────────────────────────┘
```
> "That feels more like a technical knowledge platform than a dictionary." [S2]

### [S6] Reading a Term — three depths
Three depths, each a deliberate stopping point:
1. **Summary** — one sentence, Closed Vocabulary, ≤140 characters. Serves the
   lookup user and the search snippet.
2. **Body** — two to four paragraphs on the Term page: what it is, why it exists,
   what people get wrong. Closed Vocabulary. Terms auto-link.
3. **Article** — optional, any length, exempt from Closed Vocabulary (ADR-0004).
   Reached by "read the full article".

Below the Body: what it contrasts with, what it requires, what it unlocks, how it
fails — **all generated from Edges, never a hand-maintained "see also" list.** [S6]

### [S5] Atlas demo — the term panel (as built)
Sits beside the graph rather than replacing it; resizable rather than fixed.
- Drag handle on the panel's left edge — continuous resize from closed to
  720–900px.
- `‹ ›` arrows step through preset widths; `✕` collapses it entirely.
- Definition, then the longer read — one-sentence definition in bold, paragraph
  below.
- Relationships grouped by family, each row labelled with its relation and linking
  to the other term.
- Key Concepts — taxonomic links in a two-column list (Neon variant).
- Related Terms with a "Show more" expander (past six, in Neon).
- Check yourself — three study prompts generated per term from its own edges.
- See Also — confusion pairs and alternatives as quick chips.

### [S5] Atlas demo — the full term page (eight sections)
Opens over the app from "More" / "Read the full entry". Escape or Back returns to
the graph with selection intact.
- **Lede** and long-form explanation — three or four paragraphs of real prose.
- **Diagram** — hand-built, a layered structure stack in a left-to-right sequence
  flow, with a caption.
- **Code or config example** with a language note.
- **In practice** — when you'd actually reach for it, and what bites.
- **Local graph** — live animated canvas of that term's immediate neighbourhood,
  with its own outward pulse.
- **Quiz on this term**, generated from its own edges.
- **Further reading** — specifications, papers and primary sources.
- **Connected terms** — every neighbour as a chip, colour-coded by domain.

---

## 6. Layered explanations (breaking circular terminology)

### [S3] Layered Explanations table
| Layer | Purpose | Example for Kubernetes |
|---|---|---|
| Formal | Give the canonical technical definition. | An open source container orchestration system for automating deployment, scaling, and management of containerized applications. |
| Plain English | Break circular terminology for learners. | Software that helps run and manage many containers across multiple machines. |
| In Practice | Show operational meaning. | Instead of manually placing containers on servers, Kubernetes keeps workloads running according to the desired state. |
| Why It Matters | Explain the reason the term exists. | Running a few containers manually is manageable. Running thousands across many machines requires scheduling, scaling, networking, and recovery automation. |

### [S1] "In other words…" — three layers of explanation
- **Formal:** "Kubernetes is an open-source container orchestration system…"
- **In plain English:** "Kubernetes is software that helps you run and manage lots
  of containers across multiple machines."
- **In practice:** "Instead of manually deciding which server should run each
  container, Kubernetes continuously manages where workloads run and attempts to
  keep the desired state."

Rationale [S1]: technical definitions suffer from **circular terminology**.
"Kubernetes is a container orchestration platform." → "What's orchestration?" →
"Orchestration is the automated coordination of…" → "Now you're five terms deep.
Your graph can solve this beautifully."

### [S1] "Why does this matter?" section
"Running a handful of containers manually is manageable. Running thousands of
containers across many machines is not. Kubernetes automates scheduling,
deployment, scaling, networking and recovery. That's much more useful to someone
learning than a formal definition alone."

### [S6] Closed Vocabulary (the Lexicon constraint)
Summary and Body may use only plain English plus other defined Terms; any
technical word that is neither must be added to the dictionary or rephrased away.
Enforced by lint (rule E1). Articles are exempt (ADR-0004). "It is what makes the
graph's density real rather than decorative." See `08_PROJECT_VOCABULARY.md` and
`02_SCHEMA.md`.

---

## 7. Content and provenance model

### [S3] Content and Provenance Model (Decided)
Knowledge, evidence, and presentation must be separated. This allows explanations
to change without corrupting the graph, and it allows graph relationships to be
justified by sources instead of becoming opaque generated guesses.

| Layer | Contains | Example |
|---|---|---|
| Knowledge | Structured assertions the system believes are true. | Kubernetes manages Pods. |
| Evidence | Source references supporting the assertion. | Kubernetes documentation, CNCF, standards documents, reference pages. |
| Presentation | User-facing explanations and page layout. | Kubernetes is a system for managing containerized workloads. |
| Editorial Metadata | Confidence, maturity, audience level, freshness, ambiguity notes. | Emerging, established, deprecated, vendor-specific, contested. |

### [S1] The same principle — keep three things separate
1. **Knowledge** — what the site believes is true (`Kubernetes → manages → Pods`).
2. **Evidence** — why you believe it (Kubernetes docs, CNCF, NIST, Wikipedia).
3. **Presentation** — how you explain it to users.
"This means you can change the explanation without destroying the underlying
knowledge graph. And it gives you provenance… That becomes increasingly important
as you use AI to help generate and maintain content."

### [S6] The Lexicon content pipeline
Curated term list → LLM first draft against the schema → human edit, every entry →
lint. `draft: true` until edited; the draft ratio is reported on every build (lint
rule W5). "The failure mode is rubber-stamping drafts, so the count is made loud
rather than left implicit."

---

## 8. External / "Continue learning" resources

### [S3] External Learning Resources (Decided)
TechLexicon should include a "Continue learning" area rather than a generic "read
more" link. The site provides the conceptual layer and curates links to deeper
external material.

| Resource Type | Role | Content Policy |
|---|---|---|
| Reference | Fast neutral background or canonical encyclopedia-style context. | Use for broad orientation. Confirm suitability per term. |
| Official Documentation | Authoritative product, language, framework, or standards information. | Prefer for vendor or project-specific terms when available. |
| Tutorial | Step-by-step learning support. | Use when learners need practical reinforcement. |
| Deep Dive | Detailed conceptual or implementation treatment. | Use when the term deserves more detail than TechLexicon should host. |
| Video Or Course | Alternative learning mode. | Include selectively with depth and quality metadata. |
| Academic Or Book | Formal or durable treatment. | Use especially for CS, AI, security, and theoretical concepts. |

> Note [S3]: the conversation names Wikipedia, official documentation, CNCF,
> Kubernetes documentation, GeeksforGeeks, tutorials, books, videos, courses,
> academic material, and deep dives as example resource types — it does not assert
> a complete ranked list.

### [S1] "Continue learning" (not "Read more")
Call it "Continue learning" rather than "Read more" — it communicates that these
are intentionally external resources. Categorise them: Reference · Official
documentation · Tutorial · Deep dive · Video · Course · Academic · Book.

**[S1] Source aggregation** — maintain per-term a table of resources with Type and
Depth:
| Resource | Type | Depth |
|---|---|---|
| Wikipedia | Reference | Medium |
| Kubernetes Docs | Official | Deep |
| CNCF Glossary | Reference | Short |
| GeeksforGeeks | Tutorial | Medium |
| Kubernetes Book | Book | Deep |
| YouTube lecture | Video | Deep |

"You don't need to write a 4,000-word Kubernetes article. Your site might provide:
an excellent 100–200 word explanation, a conceptual model, relationships,
examples, terminology, learning questions, a graph, and curated external
resources. Then let the Internet provide the deep dives." [S1]

### [S6] The Lexicon answer to the same problem
The optional **Article** (any length, exempt from Closed Vocabulary) is the
in-house long-form option: "a Term that needs three thousand words gets them
without the dictionary entry swelling to match." Sources are a first-class field
on every Term (RFCs, specs, textbooks, course material). See `02_SCHEMA.md`.

---

## 9. Terminology ambiguity / collisions

### [S3] Terminology Ambiguity (Recommended)
Ambiguous terms should resolve to meaning-specific entries rather than forcing one
page to cover incompatible definitions. `Node` is the recurring example: it can
mean different things in Kubernetes, networking, graph theory, distributed
systems, and Node.js.

| Ambiguity Pattern | Expected Behavior |
|---|---|
| Same spelling, different domains | Ask which meaning the user wants and show domain-specific entries. |
| Synonym or abbreviation | Resolve aliases to canonical terms while preserving the searched wording. |
| Vendor-specific usage | Label the context and avoid presenting it as universal. |
| Contested or emerging term | Show maturity status and explain that usage varies. |

### [S1] Terminology conflicts (the `Node` example)
`Node` can mean completely different things in Kubernetes, computer networking,
distributed systems, graph theory, and Node.js. Instead of one "Node" page, split
into namespaced entries and let the system detect ambiguity and ask "Which 'Node'
are you looking for?" "This is exactly where a structured knowledge model beats a
conventional glossary."

### [S6] Collisions and Disambiguation (the Lexicon model)
Domains are an array of tags. One concept genuinely the same in two fields
(`hash-function`) is **one Term** tagged `[cs, security]`. Two distinct concepts
sharing a name (`token` in CS vs security) are **separate namespaced Terms**
(`content/cs/token.md`, `content/security/token.md`); the bare name serves a
generated **Disambiguation** page. Enforced by lint (E3, ambiguous edges must be
namespaced). See `adr/0003` and `08_PROJECT_VOCABULARY.md`.

---

## 10. Compare / "don't confuse" mode

### [S3] Comparison And Difference Mode (Recommended)
Compare mode should be first class because many technical terms are understood by
contrast. The graph can show common ancestors, shared prerequisites, alternatives,
and points of confusion.

| Comparison | Why it matters |
|---|---|
| Docker vs Kubernetes | Distinguishes container tooling from orchestration and cluster management. |
| REST vs GraphQL | Clarifies API design tradeoffs. |
| VM vs Container | Explains isolation, packaging, and runtime differences. |
| Authentication vs Authorization | Separates identity from permission. |
| SQL vs NoSQL | Frames data model and query tradeoffs. |
| Process vs Thread | Clarifies operating-system concurrency terminology. |
| AI vs ML and ML vs Deep Learning | Prevents nested field names from collapsing into vague synonyms. |

### [S1] Compare mode + "show me the difference" as a first-class relationship
A Docker-vs-Kubernetes compare table (primary purpose, scope, complexity,
relationship, learn-first) plus the graph relationship. Other useful comparisons:
REST vs GraphQL, VM vs container, SQL vs NoSQL, authentication vs authorization,
Docker Compose vs Kubernetes, CI vs CD, AI vs ML, ML vs deep learning, symmetric
vs asymmetric encryption, process vs thread, monolith vs microservices.

`contrasts_with` should be explicit: Authentication answers *"Who are you?"*;
Authorization answers *"What are you allowed to do?"* — surfaced as a "Don't
confuse these" box. "That's enormously useful in technical education."

### [S2] Compare mode (VM vs Container)
```
        Virtualization
          /          \
         VM        Container
         │             │
     Hypervisor    Container Runtime
         │             │
       Kernel      Shared Kernel
```
"Then explain the conceptual differences."

### [S6] The Lexicon answer
`contrasts-with` is one of the nine closed edge types (symmetric, its own
inverse); it "drives the compare view". A future **Compare view** is reserved
(side by side, driven by `contrasts-with`). See `02_SCHEMA.md`, `04_ROADMAP.md`.

### [S5] Atlas demo — "Confused" view
"Authored comparison tables for pairs learners mix up, on the axes that separate
them." Built in all three variants.

---

## 11. Learning system

### [S3] Hierarchy And Learning Paths (Decided)
Taxonomy and learning sequence are different models. A hierarchy says where a
concept belongs. A learning path says what order helps a learner understand it.

Hierarchy example [S3]:
```
Computer Science
  Software Engineering
    Testing
    Design Patterns
  Systems
    Operating Systems
    Networking
```
Learning path example [S3]:
```
Containers -> Container Images -> Docker -> Container Orchestration ->
Kubernetes -> Deployments -> Services -> Ingress
```

### [S3] Prerequisite Experience
- Each term page should answer "what should I learn first".
- Prerequisites should be typed relationships, not hand-written one-off lists.
- The UI should show both prerequisite paths and next concepts.
- A prerequisite path can become a mini curriculum.

### [S4] Learning Paths
Learning paths should be graph-derived rather than purely linear curricula.
Illustrative path:
> Operating Systems → Processes → Virtualization → Containers → Container Images →
> Container Runtime → Networking → Distributed Systems → Kubernetes → Pods →
> Deployments → Services → Ingress → Operators

A useful future feature is **prerequisite coverage** — identifying that a learner
understands most but not all of the concepts underpinning a target concept, then
recommending the missing prerequisites.

### [S4] Adaptive / graph-aware quizzes
Quizzes should test conceptual understanding rather than dictionary definitions.
Question generation can use graph structure:
- **Concept identification:** Which concept is a prerequisite for Kubernetes?
- **Relationship questions:** How are containers and VMs different?
- **Ordering questions:** Which concept should be learned first?
- **Application questions:** Which architecture or technology fits a scenario?
- **Misconception questions:** True/false statements about conceptual distinctions.
- **Graph reasoning:** Which concept sits below another in an abstraction
  relationship?

### [S2] Make quizzes adaptive (six question kinds, with examples)
- **Concept identification:** "Which concept is a prerequisite for Kubernetes?"
- **Relationship:** "How are containers and VMs different?"
- **Ordering:** "Which concept would you learn first? A. Kubernetes B. Containers
  C. Operators D. Helm"
- **Application:** "Your application consists of 50 independently deployable
  services. Which architectural concept is particularly relevant?"
- **Misconception detection:** "True or false: Containers contain their own
  operating-system kernel."
- **Graph reasoning:** "Kubernetes relies on containers. Which of the following
  sits *below* Kubernetes in the abstraction hierarchy?"

### [S2] Difficulty / knowledge depth
Avoid plain Beginner / Intermediate / Advanced. Instead:
- **Prerequisite depth** — per-prerequisite bars (Processes, Networking,
  Containers, Distributed systems).
- **Concept depth** — Level 1 Recognition ("I've heard of Kubernetes") → Level 2
  Understanding ("I can explain what it does") → Level 3 Application ("I can use
  it") → Level 4 Reasoning ("I can explain why the architecture behaves this
  way"). "That would tie beautifully into quizzes."

### [S1] "What do I need to know first?" (the killer feature)
> Kubernetes — Difficulty: Intermediate
> Before learning this, you should understand: Container → Docker → Networking →
> Linux Process
> Next concepts: Pod → Deployment → Service → Ingress
> If you understand Kubernetes, explore: Service Mesh · Helm · Operators · GitOps ·
> Platform Engineering
"Now you've turned a dictionary into a knowledge navigation system."

### [S4] Personal knowledge map
A future learner profile could let users mark concepts as Know, Familiar,
Learning, or Don't Understand. The graph can then identify gaps and suggest next
concepts. Example: if a user understands Linux and containers but not container
images, surface Container Images as a useful next concept.

### [S2] Personal knowledge graph
Mark concepts ✓ Know / ◐ Familiar / ? Learning / ✗ Don't understand; the graph
recolours; "Recommended next concept: Container Images (because it's a missing
prerequisite)." "You have effectively created a technical learning map." Also:
"What should I learn next?" generated from the graph — e.g. "I want to become a
Platform Engineer" produces a cross-domain path.

### [S6] Study mode (reserved, not designed)
Recall questions per Term, in a sibling `<id>.quiz.yaml` so Term files stay lean.
Cloze deletion over the Summary, "which of these contrasts with X", "what must you
know before X" — all three generatable from Edges, which is the argument for doing
it at all. "Spaced repetition over a Cluster is the version worth building; a
multiple-choice quiz nobody returns to is not." (Phase 5 in the Lexicon roadmap.)

### [S5] Atlas demo — Study / Quizzes (as built)
"Generated question sets with a running score." Question generation described in
the Feature Inventory:
- **Definition** → given a one-line definition, pick the term.
- **Relationship completion** → "Kubernetes depends on …?"
- **Level placement** → which layer of the stack a term sits at (light variant).
- **Distractor filtering:** wrong answers exclude anything taxonomically joined to
  the correct term, or linked by similar-to or alternative-to. (Encryption appears
  as a distractor against Symmetric Encryption; distractors drawn from the same
  domain stay plausible.)

### [S1] Learning features summary (from the roadmap)
Questions, quizzes, flashcards, difficulty, learning paths, progress, spaced
repetition (V2 in the S1 roadmap). See `04_ROADMAP.md` and `05_FEATURE_OVERVIEW.md`.

---

## 12. Concept clusters

### [S4] Concept clusters
Not every graph interaction should expose every individual node. Concepts can be
grouped into meaningful clusters:
- Kubernetes — Core concepts: Pod, Deployment, Service, Namespace, ConfigMap, Secret
- Kubernetes — Networking: CNI, Ingress, Service Discovery, DNS
- Kubernetes — Storage: Volume, PV, PVC, CSI
- Kubernetes — Operations: Helm, Operators, GitOps

### [S2] Concept clusters
Same four Kubernetes clusters (Core / Networking / Storage / Operations). "This
makes the graph much easier to navigate."

### [S6] Cluster (the Lexicon definition)
A named group of Terms within a Domain that are taught and understood together —
`concurrency`, `cryptography`, `access-control`. One Cluster per Term. Drives
colouring, the coverage map, and the order content gets written in. See
`08_PROJECT_VOCABULARY.md`.

---

## 13. Design principles

### [S4] Design Principles
- Definitions should be useful at multiple depths: simple first, technical detail
  available.
- Relationships should be typed, meaningful and explainable.
- Do not flatten conceptual relationships into a single generic "related" category.
- Treat abstraction as contextual rather than assuming a universal
  one-dimensional hierarchy.
- Keep 3D visualization purposeful and query-driven.
- Use graph structure to power learning, search and recommendations.
- Prefer conceptual questions and applied understanding over trivia.
- Let users navigate both locally (around a term) and globally (across domains).
- Make comparison and bridge-finding first-class exploration patterns.
- Keep the normal glossary experience clean; advanced graph functionality should
  enhance rather than obstruct it.

### [S4] Suggested development framing — four connected layers
1. **Knowledge layer** — terms, definitions, examples, domains and metadata.
2. **Relationship layer** — typed edges, hierarchy, abstraction and conceptual
   dependencies.
3. **Learning layer** — quizzes, study questions, prerequisite paths and learner
   progress.
4. **Exploration layer** — search, comparison, bridge queries and 2D/3D graph
   visualization.

"This separation allows the glossary to remain useful even without the advanced
visualization, while ensuring that the graph and learning capabilities are built
on the same underlying semantic model rather than becoming separate features."

### [S1] One architectural principle
Keep Knowledge, Evidence, and Presentation separate (see §7). "Don't introduce an
AI/vector database/Neo4j/Kafka/etc. just because the architecture diagram looks
cooler with them. Start simple."
