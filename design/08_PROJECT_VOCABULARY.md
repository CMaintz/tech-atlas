# 08 — Project Vocabulary

Purpose: the project's own working vocabulary — the words used when *building* the
thing, and their deliberately-avoided alternatives. Carried forward verbatim from
`techlexicon/CONTEXT.md` [S6]. This is the "Lexicon" conception's glossary of
itself; where the B-vision uses different words for the same idea (e.g. "relation"
vs "Edge", "abstraction level" vs "Depth"/"Layer"), see the divergence table in
`00_README.md` and the mappings in `02_SCHEMA.md`.

> Note [S6]: "This file is the glossary of the *project's own* vocabulary — the
> words we use when building the thing. It is not a spec. Product decisions live in
> `docs/spec.md`; architectural decisions live in `docs/adr/`."

---

## Lexicon

A cross-domain dictionary of computer science, software engineering, cybersecurity,
AI and platform engineering, where the relationships between concepts are
first-class data and can be explored as a graph.

## Content

**Term**: The atomic unit of content — one concept, one file, one page, one node in
the graph. Whether a concept earns its own Term is decided by the granularity test
in ADR-0002. *Avoid*: entry, word, definition, node (a Term *becomes* a node; it
isn't one).

**Summary**: The single-sentence definition of a Term, capped at 140 characters and
written in Closed Vocabulary. The only field guaranteed to exist on every Term.
*Avoid*: tldr, short definition, blurb.

**Body**: The two-to-four paragraph explanation on the Term's own page, also written
in Closed Vocabulary. Explains the concept; does not tutor. *Avoid*: description,
content, long definition.

**Article**: An optional long-form piece attached to a Term, of whatever length the
subject needs. Exempt from Closed Vocabulary. Reached via "read the full article"
from the Term page. *Avoid*: blog post, deep dive, essay, guide.

**Alias**: An alternative name for the *same* concept — "mutual exclusion lock" for
"mutex". Aliases are searchable and redirect to the Term. Two concepts that merely
relate closely are separate Terms joined by an Edge, never Aliases. *Avoid*:
synonym, aka (fine as a field name, not in prose).

**Closed Vocabulary**: The constraint that a Summary or Body may use only plain
English plus other Terms. Any technical word that is neither must be added to the
dictionary or rephrased away. Enforced by lint; it is what makes the graph's
density real rather than decorative. *Avoid*: controlled vocabulary, restricted
language.

## Structure

**Domain**: A subject area a Term belongs to: `cs`, `security`, `ai`, or `platform`.
A Term may belong to several. Domains are tags, not folders-of-record — see
ADR-0003. *Avoid*: section, category, subject, vertical.

**Cluster**: A named group of Terms within a Domain that are taught and understood
together — `concurrency`, `cryptography`, `access-control`. One Cluster per Term.
Drives colouring, the coverage map, and the order content gets written in. *Avoid*:
topic, group, category, tag.

**Collision**: Two distinct concepts in different Domains that share a name —
`token` in CS versus `token` in security. Each is its own Term; the shared name
resolves to a Disambiguation page. *Avoid*: homonym (accurate but unfamiliar),
conflict, duplicate.

**Disambiguation**: The generated page listing every Term that answers to a
colliding name. Never authored by hand. *Avoid*: disambig page, name index.

## Relationships

**Edge**: A typed, directed relationship between two Terms. Authored on one side
only; the inverse is generated. *Avoid*: link, relation, connection, reference.

**Edge Type**: The kind of relationship an Edge expresses — `requires`, `kind-of`,
`contrasts-with`, `mitigates`, and the rest of the closed set in `schema.ts`. The
set is closed: a new Edge Type is a deliberate change, not something an author
invents mid-entry. *Avoid*: relationship type, predicate, edge kind.

**Mention**: An untyped Edge derived automatically from one Term appearing inside
another's prose. Never authored. Weaker than an authored Edge and rendered
differently. *Avoid*: implicit link, auto-link, backlink.

**Depth**: A Term's distance from the foundations, computed as the longest path to
it through `requires` Edges. Derived, never authored — see ADR-0001. Drives the
vertical axis of the graph and the ordering of a Path. *Avoid*: level, abstraction
level, tier, difficulty.

**Layer**: An optional facet saying where a Term sits in a Domain's own stack — `os`
and `runtime` for CS, `network` and `governance` for security. A filter and a
colour, never a position. *Avoid*: abstraction, level, stack level.

**Neighbourhood**: The Terms within one or two Edges of a given Term. What the
sidebar graph renders. *Avoid*: local graph, related terms, context.

**Path**: An ordered walk through `requires` Edges — either everything needed before
a Term, or the conceptual route between two Terms. *Avoid*: learning path, route,
trail, journey.

## Later

**Quiz**: A set of recall questions attached to a Term, held in a sibling file so
Term files stay lean. Not built yet — see `docs/spec.md`. *Avoid*: test, exercise,
flashcard (a flashcard is one possible rendering of a Quiz).

---

## Vocabulary crosswalk (Lexicon term ↔ B-vision / Atlas term)

For the cut/keep session — the same concept under different names across the
conceptions:

| Concept | Lexicon [S6] | TechLexicon [S3/S4] | Atlas [S5] |
|---|---|---|---|
| Atomic unit | Term | Term / concept | term (`glossary-data.js` record) |
| Short definition | Summary (≤140, Closed Vocab) | short definition / formal definition | `short` |
| Long definition | Body (Closed Vocab) + Article (exempt) | plain-English / technical / layered definitions | `long` + deep content |
| Alternative name | Alias (`aka`) | alias / synonym_of / abbreviation_of | `aka` |
| Typed relationship | Edge / Edge Type (9, closed) | Relation / relationship type (14–18) | `rel` (17, four families) |
| Untyped prose link | Mention | (auto-link) | — |
| Vertical position | Depth (derived from `requires`) | abstraction level / spatial lens | taxonomy depth (derived) / `level` |
| Categorical facet | Layer | layer / domain / subdomain | `field` (domain) |
| Grouping | Cluster | cluster / subdomain | domain grouping |
| Name clash | Collision → Disambiguation | TermSense / ambiguity handling | — |
| Local view | Neighbourhood | local graph / depth-1 | focus neighbourhood |
| Ordered walk | Path | learning path / prerequisite path / bridge | `precedes`/`builds-on` chains |
| Recall test | Quiz (sibling `.quiz.yaml`) | quiz / flashcard / question | Study/Quizzes (generated) |
