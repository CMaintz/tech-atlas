# 02 — Data Model & Schema

Purpose: every data model, entity shape, relationship-type set, and content
constraint found across the sources, reproduced side by side. This is where the
sources diverge most sharply (edge-type counts, domains, closed vs open sets), so
each variant is preserved verbatim with provenance. See the divergence table in
`00_README.md`.

---

## 1. Relationship / edge type sets

There are **four** distinct relation-type vocabularies in the sources (some sources
share one). They are listed here in full, unmodified, because choosing among them
is the single biggest schema decision. In summary:

- **9 types**, *closed* — [S6] Lexicon (§1a).
- **14 types**, hyphenated — [S2] chat and [S4] dev doc, which use the *same* set
  (§1c = §1d).
- **17 types**, snake_case — [S3] arch spec and [S1] chat, which use the *same* set
  (§1b = §1e); [S3] presents it as a table, [S1] as a TypeScript union.
- **17 types**, hyphenated, grouped in four families — [S5] Atlas as built (§1f):
  the 14-type set plus three added (instance-of, solves, supersedes).

### 1a. [S6] Lexicon — the 9-type **closed** set (with generated inverses)
From `techlexicon/schema.ts`. Authors write **one direction only**; the inverse is
generated at build time. Adding a type is a deliberate schema change ("every type
costs a colour, a filter, a legend entry and an authoring decision").

| Type | Inverse | Symmetric | Meaning |
|---|---|---|---|
| `requires` | `unlocks` | no | Must be understood first. Acyclic; the graph Depth is computed from. |
| `kind-of` | `has-kind` | no | Taxonomic parent: `spinlock` kind-of `lock`. |
| `part-of` | `has-part` | no | Composition: `tcp-handshake` part-of `tcp`. |
| `contrasts-with` | `contrasts-with` | **yes** | Easily confused, meaningfully different. Drives the compare view. |
| `implements` | `implemented-by` | no | Concrete realises abstract: `raft` implements `consensus`. |
| `supersedes` | `superseded-by` | no | Replaced in practice: `tls` supersedes `ssl`. |
| `causes` | `caused-by` | no | Goes wrong like this: `mutex` causes `deadlock`. |
| `mitigates` | `mitigated-by` | no | Security: control against a weakness. `salting` mitigates `rainbow-table-attack`. |
| `exploits` | `exploited-by` | no | Security: attack against a weakness. `sql-injection` exploits `input-validation`. |

### 1b. [S3] TechLexicon Product & Architecture Spec — the 17-type set
Each relation has a stored meaning and an example. **17 types including the
`related_to` fallback** "pending editorial review". This is the *same* set as
[S1]'s TypeScript union (§1e), reproduced there as a type rather than a table.

| Type | Meaning | Example |
|---|---|---|
| `broader_than` | Source concept is more general than target. | Cloud computing broader_than Kubernetes. |
| `narrower_than` | Source concept is more specific than target. | Kubernetes narrower_than cloud native. |
| `is_a` | Source is a kind of the target. | PostgreSQL is_a relational database. |
| `part_of` | Source is a component/part of the target. | Pod part_of Kubernetes workload model. |
| `has_part` | Source contains/includes the target. | Kubernetes has_part Pod. |
| `prerequisite` | Target should be understood before the source. | Container prerequisite Kubernetes. |
| `builds_on` | Source depends conceptually/technically on the target. | Kubernetes builds_on containerization. |
| `implements` | Source implements the target concept/pattern. | OAuth server implements authorization flows. |
| `implemented_by` | Source concept is implemented by the target. | Container orchestration implemented_by Kubernetes. |
| `commonly_used_with` | The concepts are commonly used together. | Kubernetes commonly_used_with Helm. |
| `alternative_to` | Solve similar problems in different ways. | Docker Swarm alternative_to Kubernetes. |
| `contrasts_with` | Often compared or confused. | Authentication contrasts_with authorization. |
| `synonym_of` | Equivalent or near-equivalent meaning in context. | ML synonym_of machine learning where context allows. |
| `abbreviation_of` | Term expands to a longer canonical name. | OIDC abbreviation_of OpenID Connect. |
| `example_of` | Source is an example of the target. | Dijkstra example_of shortest path algorithm. |
| `used_for` | Source is used for the target purpose. | TLS used_for encrypted transport. |
| `related_to` | Fallback when the precise relationship is not yet classified. | Temporary relation pending editorial review. |

*(17 named types, including the `related_to` fallback — reproduced exactly as in the
source. Identical to [S1]'s TypeScript union in §1e.)*

### 1c. [S4] Product Development Document — the 14-type set (with example directions)
- `is-a` → Container Runtime → Software
- `part-of` → Pod → Kubernetes
- `implements` → Docker → OCI
- `depends-on` → Kubernetes → Container Runtime
- `alternative-to` → Docker → Podman
- `precedes` → Container → Kubernetes
- `builds-on` → Kubernetes → Containers
- `similar-to` → Container → VM
- `opposite-of` → Encryption → Plaintext
- `used-with` → Terraform ↔ Kubernetes
- `commonly-confused-with` → Container ↔ VM
- `specialization-of` → CNN → Neural Network
- `abstraction-of` → HTTP → TCP/IP
- `belongs-to` → Kubernetes → Cloud Native

> Example relationship explanation [S4]: Kubernetes → Containers, relationship =
> "orchestrates". The system could explain that Kubernetes manages deployment,
> scheduling, scaling and lifecycle of containerized workloads.

### 1d. [S2] Other chat session — the same 14-type set (this is where 1c originates)
- **is-a** → Container Runtime → Software
- **part-of** → Pod → Kubernetes
- **implements** → Docker → OCI
- **depends-on** → Kubernetes → Container Runtime
- **alternative-to** → Docker → Podman
- **precedes** → Container → Kubernetes
- **builds-on** → Kubernetes → Containers
- **similar-to** → Container → VM
- **opposite-of** → Encryption → Plaintext
- **used-with** → Terraform ↔ Kubernetes
- **commonly-confused-with** → Container ↔ VM
- **specialization-of** → CNN → Neural Network
- **abstraction-of** → HTTP → TCP/IP
- **belongs-to** → Kubernetes → Cloud Native

### 1e. [S1] Chat session — the 17-type TypeScript union
```ts
type RelationType =
  | "broader_than"
  | "narrower_than"
  | "is_a"
  | "part_of"
  | "has_part"
  | "prerequisite"
  | "builds_on"
  | "implements"
  | "implemented_by"
  | "commonly_used_with"
  | "alternative_to"
  | "contrasts_with"
  | "synonym_of"
  | "abbreviation_of"
  | "example_of"
  | "used_for"
  | "related_to";
```

### 1f. [S5] Atlas demo — 17 types in **four families** (as built)
"Your original fourteen, plus three added." The grouping drives sidebar sections,
edge colour and line style, and the link filters. "Added" marks the three new ones.

| Type | Family | Example | Origin |
|---|---|---|---|
| is-a | Taxonomy | Container Runtime → Software | Yours |
| part-of | Taxonomy | Pod → Kubernetes | Yours |
| specialization-of | Taxonomy | CNN → Neural Network | Yours |
| belongs-to | Taxonomy | Kubernetes → Cloud Native | Yours |
| instance-of | Taxonomy | Kubernetes → Container Orchestrator | **Added** |
| implements | Mechanics | Docker → OCI | Yours |
| depends-on | Mechanics | Kubernetes → Container Runtime | Yours |
| builds-on | Mechanics | Kubernetes → Containers | Yours |
| abstraction-of | Mechanics | HTTP → TCP/IP | Yours |
| used-with | Mechanics | Terraform ↔ Kubernetes | Yours |
| solves | Mechanics | Terraform → Configuration Drift | **Added** |
| precedes | Lineage | Container → Kubernetes | Yours |
| supersedes | Lineage | Kubernetes → Docker Swarm | **Added** |
| similar-to | For study | Container ↔ VM | Yours |
| alternative-to | For study | Docker → Podman | Yours |
| opposite-of | For study | Encryption → Plaintext | Yours |
| commonly-confused-with | For study | Container ↔ VM | Yours |

> [S5] Edges are authored one-way. Inverses are derived at load, so *Pod part-of
> Kubernetes* automatically gives Kubernetes a "has part" entry without a second
> declaration. Symmetric types (`used-with`, `similar-to`, `commonly-confused-with`)
> keep their own label in both directions. Aliases are the fourth addition: they
> are not an edge type — `aka` is a per-term field (§2), searchable and displayed
> without adding nodes to the graph.

---

## 2. Entity / term models

### 2a. [S6] Lexicon — the authored Term schema (Zod), reproduced in full
From `techlexicon/schema.ts`. Everything here is written by hand; anything derived
(Depth, inverse Edges, Mentions, Disambiguation pages) is computed at build time
and never appears in a content file.

```ts
import { z } from "zod";

/* Identity ------------------------------------------------------------- */

/** Kebab-case, unique within a Domain. Also the URL slug. */
export const TermId = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be kebab-case");

export const Domain = z.enum(["cs", "security", "ai", "platform"]);
export type Domain = z.infer<typeof Domain>;

/**
 * A pointer to another Term, either bare (`mutex`) or namespaced
 * (`security/token`). Bare references resolve within the referring Term's
 * own Domain; lint rejects a bare reference whose name exists in more than
 * one Domain. See ADR-0003.
 */
export const TermRef = z
  .string()
  .regex(
    /^(cs\/|security\/|ai\/|platform\/)?[a-z0-9]+(-[a-z0-9]+)*$/,
    "must be `id` or `domain/id`, kebab-case",
  );

/* Edges ---------------------------------------------------------------- */

/**
 * The closed set of authored Edge Types, each paired with the inverse
 * generated at build time. Authors write one direction only.
 */
export const EDGE_TYPES = {
  requires:         { inverse: "unlocks",        symmetric: false },
  "kind-of":        { inverse: "has-kind",       symmetric: false },
  "part-of":        { inverse: "has-part",       symmetric: false },
  "contrasts-with": { inverse: "contrasts-with", symmetric: true  },
  implements:       { inverse: "implemented-by", symmetric: false },
  supersedes:       { inverse: "superseded-by",  symmetric: false },
  causes:           { inverse: "caused-by",      symmetric: false },
  mitigates:        { inverse: "mitigated-by",   symmetric: false },
  exploits:         { inverse: "exploited-by",   symmetric: false },
} as const;

export type EdgeType = keyof typeof EDGE_TYPES;

export const Edges = z
  .object(
    Object.fromEntries(
      Object.keys(EDGE_TYPES).map((k) => [k, z.array(TermRef).optional()]),
    ) as Record<EdgeType, z.ZodOptional<z.ZodArray<typeof TermRef>>>,
  )
  .strict();

/* Layer — a facet, never a position. See ADR-0001. --------------------- */

export const LAYERS = {
  cs: ["hardware","architecture","os","runtime","language","framework","application","theory"],
  security: ["network","host","application","data","identity","people","governance"],
  ai: ["hardware","model","training","inference","agent","application","theory"],
  platform: ["infrastructure","orchestration","delivery","observability","process"],
} as const;

const AnyLayer = z.enum(Object.values(LAYERS).flat() as [string, ...string[]]);

/* Term frontmatter ----------------------------------------------------- */

export const TermFrontmatter = z
  .object({
    id: TermId,                          // Unique within Domain; matches the filename.
    term: z.string().min(1),             // Display form: "Mutex", "TLS", "Race Condition".
    aka: z.array(z.string()).default([]),// Other names for the SAME concept. Searchable, redirect here.
    domain: z.array(Domain).min(1),      // Every Domain this Term genuinely belongs to. ADR-0003.
    cluster: z.string().min(1),          // The one group taught alongside. `concurrency`, `cryptography`.
    layer: AnyLayer.optional(),          // Optional facet. Must belong to one of this Term's Domains.
    era: z.number().int().min(1930).max(2100).optional(), // Year the idea entered common use.
    status: z.enum(["current","legacy","emerging"]).default("current"),
    summary: z.string().min(1).max(140), // One-sentence definition. Closed Vocabulary, enforced.
    edges: Edges.default({}),            // Typed relationships, authored one direction only.
    article: z.string().optional(),      // Optional long-form, exempt from Closed Vocabulary. ADR-0004.
    sources: z.array(z.object({ title: z.string(), url: z.string().url().optional() })).default([]),
    draft: z.boolean().default(false),   // Set while LLM-drafted and not yet edited by a human.
  })
  .strict();

export type TermFrontmatter = z.infer<typeof TermFrontmatter>;

/* Derived at build — never authored, never committed. ------------------ */

export type CompiledTerm = TermFrontmatter & {
  depth: number;             // Longest path to this Term through `requires`. ADR-0001.
  resolvedEdges: Array<{ type: string; to: string; generated: boolean }>;
  mentions: string[];        // Untyped Edges harvested from prose auto-links.
  collides: boolean;         // True when another Domain holds a different Term of the same name.
};
```

### 2b. [S3] TechLexicon — Knowledge Graph Model (Term + TermRelation)
```
Term
  id
  slug
  canonicalName
  aliases
  domains
  maturityStatus
  difficulty
  abstractionLevel
  definitions
  resources

TermRelation
  sourceTermId
  targetTermId
  type
  weight
  confidence
  description
  evidenceReferences
  editorialStatus
```
> Decided [S3]: Relationships must be typed. A generic related-terms list is not
> enough because the product needs prerequisites, hierarchy, comparisons, paths,
> and explainable graph traversal.

### 2c. [S3] TechLexicon — Data Model Concepts (full entity list)
| Entity | Purpose | Representative fields |
|---|---|---|
| **Term** | Canonical concept entry. | id, slug, canonical_name, aliases, domains, maturity_status, difficulty, abstraction_level. |
| **TermSense** | Domain-specific meaning for ambiguous terms. | term_id, domain, sense_name, disambiguation_summary. |
| **Definition** | Layered explanation content. | term_id, layer, text, reading_level, editorial_status. |
| **Relation** | Typed graph edge. | source_id, target_id, type, weight, confidence, description. |
| **Source** | Evidence and provenance. | title, url, publisher, source_type, accessed_at, reliability_notes. |
| **EvidenceReference** | Join between claims and sources. | claim_id or relation_id, source_id, excerpt_summary, confidence. |
| **ExternalResource** | "Continue learning" link. | term_id, url, title, resource_type, depth, format, editorial_note. |
| **Question** | Quiz or study item. | term_id, prompt, answer, distractors, difficulty, source. |
| **UserProgress** | Learning state. | user_id, term_id, known_status, quiz_score, last_reviewed_at. |
| **Embedding** | Semantic-search representation. | entity_type, entity_id, embedding, model_version. |

### 2d. [S4] Product Development Document — conceptual Term & Relationship model
**Candidate Term fields:** Name · Aliases / alternative names · Definition · Simple
explanation · Technical explanation · Examples · When / why used · Domain and
subdomain · Abstraction context / level · Difficulty or conceptual depth ·
Prerequisites · Relationships to other concepts · Common misconceptions · Quiz /
study questions · Further reading / resources · History / origin · Metadata.

Conceptual structure [S4]:
- **Term** → name, aliases, definition, explanation, examples, domain, subdomain,
  abstraction context, etc.
- **Relationship** → source term, target term, relationship type, strength,
  confidence, explanation.
- **Learning content** → quiz questions, study questions, prerequisites, learning
  paths.
- **User knowledge** → known, familiar, learning, or not-understood states
  (future/personalization layer).

> [S4] The relationship itself should be a **first-class entity** so it can carry
> an explanation, strength and confidence.

### 2e. [S2] Other chat — conceptual model (verbatim shape)
```
Term
├── name
├── aliases
├── definition
├── explanation
├── examples
├── domain
├── subdomain
├── abstraction_level
├── difficulty
├── prerequisites[]
├── relationships[]
├── misconceptions[]
├── quiz_questions[]
├── resources[]
└── metadata

Relationship
├── source_term
├── target_term
├── relationship_type
├── strength
├── confidence
└── explanation
```
Fuller candidate field list for a term [S2]: Definition · Simple explanation ·
Technical explanation · Examples · When/why you use it · Related technologies ·
Prerequisites · Concepts it enables · Common misconceptions · Typical interview
questions · Quiz questions · Further reading · Synonyms / alternative names ·
History / origin · Category · Abstraction level · Relationships to other concepts.

### 2f. [S1] Chat — the TermRelation interface (TypeScript)
```ts
interface TermRelation {
  sourceTermId: string;
  targetTermId: string;
  type: RelationType;          // see §1e
  confidence?: number;
  description?: string;
  sources?: SourceReference[];
}
```
> "The last two are particularly interesting… `Why? Helm is commonly used to
> package and deploy Kubernetes applications. Source: CNCF / Kubernetes
> documentation.` That makes the graph explainable instead of becoming a
> collection of AI-generated guesses." [S1]

Relational sketch for PostgreSQL [S1]:
```
terms                term_relations
------               ---------------
id                   source_term_id
slug                 target_term_id
name                 relation_type
definition           weight
...                  confidence
                     ...
```
Then generate `{ "nodes": [...], "links": [...] }` for the visualization.

### 2g. [S5] Atlas demo — the data model (as built, `glossary-data.js`)
Authored in `glossary-data.js`, separate from every UI; all three variants import
it unchanged.

| Field | What it holds |
|---|---|
| `id` | Stable slug, used as the edge target. |
| `term` | Display name. |
| `aka` | Aliases and abbreviations — searchable, shown as "Also known as". |
| `field` | One of five domains; drives node colour and index grouping. |
| `short` | One-sentence definition — fills tooltips, search results, quiz prompts. |
| `long` | Paragraph definition for the side panel. |
| `level` | Hand-assigned abstraction level 1–5 (now superseded — see the vertical-axis discussion in `03_ARCHITECTURE.md`). |
| `rel` | Outbound typed edges; inverses are derived at load. |

Corpus totals [S5]: **109 terms · 178 typed edges · 17 relation types · 5 domains.**
(Six of the 109 have authored long-form deep content in `deep-content.js`.)

### 2h. [S7] Deep-research report — recommended glossary entry schema
A JSON-like schema (from the external research); reproduced for comparison.

| Field | Type | Purpose |
|---|---|---|
| `term` | string | Canonical name of the concept. |
| `aliases` | array[string] | Alternate names, acronyms, synonyms. |
| `definition` | string (rich text) | Formal definition/description. |
| `examples` | array[string\|object] | Illustrative examples or analogies. |
| `code_snippets` | array[string] | Example code (if applicable). |
| `diagrams` | array[string] (URLs) | Diagrams/images illustrating the concept. |
| `related_terms` | array[obj] | Related concepts with relation type. |
| `difficulty` | string (enum) | Learner level/complexity. |
| `tags` | array[string] | Categories, fields or keywords. |
| `sources` | array[string] (URLs) | References/URLs for definitions. |
| `revision_history` | array[obj] | Edit history (timestamps, authors, notes). |
| `learning_items` | array[obj] | Linked quiz/flashcard IDs or resources. |
| `assessment_items` | array[obj] | Questions (flashcards or quiz Q&A). |
| `metadata` | object | Other meta (created date, license, etc.). |

Example instance and full discussion in `06_RESEARCH_OVERVIEW.md` §5.

---

## 3. Domains

| Source | Domains |
|---|---|
| [S6] Lexicon | `cs`, `security`, `ai`, `platform` (4). Launch: cs + security. |
| [S3] TechLexicon | Computer Science, Software Engineering, Platform Engineering, Artificial Intelligence, Cybersecurity (5). |
| [S4] | computer science, software engineering, platform engineering, AI, cybersecurity (5). |
| [S5] Atlas | 5 domains (per-domain node colour, one hue per domain). |

### [S3] Scope And Domains (Decided) — with design implications
| Domain | Representative coverage | Design implication |
|---|---|---|
| Computer Science | Algorithms, data structures, OS, networking, graph theory, complexity, computation. | Requires hierarchy, prerequisites, and formal definitions. |
| Software Engineering | Architecture, design patterns, testing, CI/CD, APIs, databases, dev practices. | Requires compare mode, examples, and practical explanations. |
| Platform Engineering | Cloud-native systems, Kubernetes, containers, IaC, observability, GitOps. | Requires typed operational relationships and learning paths. |
| Artificial Intelligence | ML, deep learning, embeddings, agents, model evaluation, retrieval, vector search. | Requires concept maturity and rapidly evolving terminology. |
| Cybersecurity | Authentication, authorization, encryption, threat models, identity, vulnerabilities. | Requires careful distinction between related but easily confused terms. |

### [S6] Why Security is a launch domain (not a follow-on)
"It shares a launch because it has a real reader with a real deadline, and because
it is the Domain that stress-tests the model hardest: it collides with CS on `key`,
`salt`, `token`, `nonce`, `agent` and `policy`, and it bridges to CS wherever a
fundamental has an attack surface — a race condition is a TOCTOU vulnerability, an
unbounded buffer is a buffer overflow. Those bridges are the most valuable edges in
the graph and they only exist if both Domains are written in parallel."

---

## 4. Layers (facet, per domain) — [S6]

`layer` is an optional per-Domain facet ("a filter and a colour, never a
position"). Must belong to one of the Term's Domains (lint E8).

- **cs:** hardware, architecture, os, runtime, language, framework, application, theory
- **security:** network, host, application, data, identity, people, governance
- **ai:** hardware, model, training, inference, agent, application, theory
- **platform:** infrastructure, orchestration, delivery, observability, process

### [S4] / [S2] Illustrative abstraction layers (the other view)
A layered stack discussed in the B-vision (modelled as a **partial ordering**, not
a universal numeric ladder):
- **Physical:** CPU, RAM, SSD, network interface
- **Systems:** process, thread, virtual memory, filesystem
- **Infrastructure:** VM, container, network, load balancer
- **Platform:** Kubernetes, Terraform, CI/CD, service mesh
- **Architecture:** microservices, event-driven architecture, distributed systems
- **Application:** REST API, authentication, domain-driven design

> [S4] "Abstraction is not a single universal ladder. A concept can be high-level
> relative to one concept and low-level relative to another." Model as a partial
> ordering / graph. See ADR-0001 for how the Lexicon resolves this (derived Depth).

---

## 5. Status / maturity vocabularies

| Source | Status values |
|---|---|
| [S6] Lexicon | `current`, `legacy`, `emerging` (`status` field; "legacy and emerging are rendered differently; they are not deprecations"). |
| [S1] Chat | Established, Emerging, Deprecated, Historical, Vendor-specific, Contested, Ambiguous ("Concept maturity"). |
| [S3] TechLexicon | Emerging, established, deprecated, vendor-specific, contested (editorial metadata). |

> [S1] "Service Mesh → Established; Agentic AI → Emerging / rapidly evolving;
> Serverless Kubernetes → Ambiguous / context-dependent. That is useful metadata
> that ordinary dictionaries don't generally provide."

---

## 6. Lint rules — the Lexicon quality bar  ·  [S6]

From `techlexicon/docs/lint-rules.md`. "The quality bar, expressed as code rather
than good intentions. Runs in CI on every content change." Reproduced in full.

### Errors — the build fails
| # | Rule | Why |
|---|---|---|
| E1 | **Unknown jargon.** Every word in `summary` and the Body is either plain English, a defined Term, an Alias, or in `allowed-words.txt`. | The Closed Vocabulary constraint (ADR-0004). The rule the project exists to enforce. |
| E2 | **Dangling Edge.** Every Edge target resolves to a real Term. | A broken edge is an invisible lie in the graph. |
| E3 | **Ambiguous Edge.** A bare Edge target whose name exists in more than one Domain must be namespaced. | Silent cross-domain resolution wires the graph wrongly (ADR-0003). |
| E4 | **`requires` cycle.** The `requires` graph is a DAG. | Depth is undefined otherwise (ADR-0001). |
| E5 | **Circular definition.** No set of Terms defines each other with no plain-English grounding anywhere in the loop. | "A process runs a thread; a thread runs in a process" teaches nobody anything. |
| E6 | **Tautological summary.** `summary` must not begin by restating `term`. | "A mutex is a mutex that…" |
| E7 | **Duplicate identity.** No two Terms share an `id` within a Domain; no Alias collides with another Term's `id` or Alias. | |
| E8 | **Layer out of Domain.** `layer` must belong to one of the Term's own Domains. | |
| E9 | **Missing article file.** `article:` points at a file that exists. | |
| E10 | **Schema violation.** Frontmatter parses against `schema.ts`. | |
| E11 | **Semantic vectors out of date.** `supabase/seed/term-vectors.json` has a vector for every Term (and none for removed ones) and was built with the current model settings; re-run `npm run embed` (A52, A66). | |

### Warnings — visible, not blocking
| # | Rule | Why |
|---|---|---|
| W1 | **Orphan.** A Term with no authored Edges. | It exists outside the graph. |
| W2 | **Redundant child.** Edges are a subset of its `kind-of` parent's *and* its `summary` contains the parent's name. | Granularity test 2+3 (ADR-0002). A prompt to merge, never an instruction. |
| W3 | **No prerequisites.** A non-foundational Term with an empty `requires`. | Lazy prerequisites flatten the graph and break learning Paths. |
| W4 | **Thin neighbourhood.** Fewer than three authored Edges. | |
| W5 | **Still a draft.** `draft: true`. | LLM-drafted content that hasn't been edited is the single biggest quality risk. |
| W6 | **Untouched Mentions.** Mentioned in prose by five or more others but with no authored Edge to any of them. | A relationship the author keeps implying but never typed. |
| W8 | **Semantic vector embeds older text.** A Term's name, aliases, summary or plain facet changed since `npm run embed` (A52, A66). | Its search-by-meaning match is slightly stale until re-embedded. |

### Reports — produced every build, block nothing
- **Coverage map**: Terms per Cluster, and Clusters with fewer than ten Terms.
- **Depth histogram**: all depth-0/1 means `requires` is being skipped.
- **Collision list**: every name serving a Disambiguation page.
- **Draft ratio** per Domain.

### Exemptions
`allowed-words.txt` holds words that are technical but will never be Terms (proper
nouns, file formats, company names, common abbreviations). "Deliberately annoying
to add to: one word per line, alphabetical, with a comment saying why. Friction
here protects E1 from becoming a rubber stamp."

---

## 7. Derived / build-time data (never authored)

### [S6] Lexicon
- **Depth** — longest path through `requires` (ADR-0001).
- **Inverse Edges** — generated from the authored direction.
- **Mentions** — untyped edges harvested from prose auto-links.
- **Disambiguation pages** — generated from collisions.
- **collides** flag — true when another Domain holds a different Term of the same name.

### [S5] Atlas (as built)
- Inverse edges derived at load.
- Node/edge counts, layout coordinates (force solve).
- Quiz distractor sets, generated per term from edges.
