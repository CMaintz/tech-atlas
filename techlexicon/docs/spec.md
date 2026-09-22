# Lexicon — product spec

Status: draft, nothing built. Vocabulary in [CONTEXT.md](../CONTEXT.md); decisions in
[docs/adr](./adr); content shape in [schema.ts](../schema.ts); quality bar in
[lint-rules.md](./lint-rules.md).

## What it is

A dictionary of computer science, software engineering, cybersecurity, AI and platform
engineering in which the relationships between concepts are authored data, not prose
hyperlinks — so the whole vocabulary can be read as a graph, walked as a learning path,
and searched as a reference.

## Who it is for

1. **Someone mid-task who hit a word they don't know.** Needs the Summary in under five
   seconds from a Google result. This user never sees the graph and must still be served
   perfectly.
2. **Someone studying a syllabus** — the immediate case is a cybersecurity course. Needs
   lookup, needs to know what a term contrasts with and what it presupposes, and later
   needs to test recall.
3. **Someone with a shape-of-the-field question.** "Where does this sit, what's next to
   it, what do I need first?" This is the user the graph exists for.

Ranked deliberately. The graph is the differentiator but it is not the primary use.

## Domains at launch

`cs` and `security` ship together. `ai` and `platform` are modelled from day one
(ADR-0003) and written later.

Security is not a follow-on section. It shares a launch because it has a real reader with
a real deadline, and because it is the Domain that stress-tests the model hardest: it
collides with CS on `key`, `salt`, `token`, `nonce`, `agent` and `policy`, and it bridges
to CS wherever a fundamental has an attack surface — a race condition is a TOCTOU
vulnerability, an unbounded buffer is a buffer overflow. Those bridges are the most
valuable edges in the graph and they only exist if both Domains are written in parallel.

Security content is organised against course syllabi rather than invented taxonomy, and
the syllabus glossary is the granularity oracle (ADR-0002): if the exam lists it
separately, it is a Term.

## Reading a Term

Three depths, each a deliberate stopping point:

1. **Summary** — one sentence, Closed Vocabulary, ≤140 characters. Serves the lookup user
   and the search snippet.
2. **Body** — two to four paragraphs on the Term page: what it is, why it exists, what
   people get wrong. Closed Vocabulary. Terms auto-link.
3. **Article** — optional, any length, exempt from Closed Vocabulary (ADR-0004). Reached
   by "read the full article". This is the blog-post-sized resource; a Term that needs
   three thousand words gets them without the dictionary entry swelling to match.

Below the Body: what it contrasts with, what it requires, what it unlocks, how it fails.
All generated from Edges — never a hand-maintained "see also" list.

## The graph

A persistent sidebar showing the current Term's Neighbourhood, expandable to fullscreen.
Always present, never the only route to content.

- **2D is the default.** Readable labels, precise clicking, works on a phone.
- **3D is a mode**, not the front door. It earns its place only because the vertical axis
  means something: Depth, computed from `requires` (ADR-0001). The result is a layered
  dependency graph with foundations at the bottom — the one 3D form that reads.
- Edge Type drives colour; Cluster drives grouping; Domain drives filtering; `status` and
  `era` drive the optional history view.
- Every node is a link to a real, statically rendered page. The canvas is an index, not a
  container.

## Later phases, reserved but not designed

- **Study mode.** Recall questions per Term, in a sibling `<id>.quiz.yaml` so Term files
  stay lean. Cloze deletion over the Summary, "which of these contrasts with X", "what
  must you know before X" — all three generatable from Edges, which is the argument for
  doing it at all. Spaced repetition over a Cluster is the version worth building; a
  multiple-choice quiz nobody returns to is not.
- **Path finder.** Shortest conceptual route between any two Terms.
- **Compare view.** Side by side, driven by `contrasts-with`.
- **"You are here."** Name three Terms you know, get a personalised entry point.
- **Coverage map** as a public page — honest about what is thin.

## Build order

| Phase | Ships | Done when |
|---|---|---|
| 1 | Schema, lint, build pipeline. Two pilot Clusters: CS concurrency (~40 Terms) and security auth/crypto (~40 Terms), chosen to collide and bridge. Graph renders. | The model survives 80 real Terms, collisions resolve, the graph doesn't look like a hairball. |
| 2 | Static Term pages, search, Aliases, sidebar graph, SEO. | The course reader can look things up on a phone. This is the first phase with a user. |
| 3 | Content to ~250 CS + ~150 security. Articles for the twenty Terms that need them. | Coverage map has no Cluster under ten. |
| 4 | 3D mode, Paths, compare view, era view. | |
| 5 | Study mode. AI and platform Domains. | |

Phase 2 before phase 4 is deliberate: lookup beats spectacle, and there is a reader
waiting on lookup.

## Content pipeline

Curated term list → LLM first draft against the schema → human edit, every entry → lint.
`draft: true` until edited; the draft ratio is reported on every build (W5). The failure
mode is rubber-stamping drafts, so the count is made loud rather than left implicit.

## Open questions

- Working name. `lexicon` is a placeholder.
- Which cybersecurity course, specifically? Its syllabus seeds the security term list and
  settles granularity calls.
- Astro or Next. Astro suits a content site with an interactive island; Next is one
  framework for everything. Not urgent — phase 1 produces a JSON graph either way.
