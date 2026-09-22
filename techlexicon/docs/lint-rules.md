# Lint rules

The quality bar, expressed as code rather than good intentions. Runs in CI on every
content change. Written *before* bulk content, because a rule added after four hundred
Terms exist is a rule nobody will ever get to green.

Nothing here is built yet. This is the specification.

## Errors — the build fails

| # | Rule | Why |
|---|---|---|
| E1 | **Unknown jargon.** Every word in `summary` and the Body is either plain English, a defined Term, an Alias, or in `allowed-words.txt`. | The Closed Vocabulary constraint (ADR-0004). This is the rule the project exists to enforce. |
| E2 | **Dangling Edge.** Every Edge target resolves to a real Term. | A broken edge is an invisible lie in the graph. |
| E3 | **Ambiguous Edge.** A bare Edge target whose name exists in more than one Domain must be namespaced. | Silent cross-domain resolution wires the graph wrongly, undetectably (ADR-0003). |
| E4 | **`requires` cycle.** The `requires` graph is a DAG. | Depth is undefined otherwise (ADR-0001). |
| E5 | **Circular definition.** No set of Terms defines each other with no plain-English grounding anywhere in the loop. | "A process runs a thread; a thread runs in a process" teaches nobody anything. |
| E6 | **Tautological summary.** `summary` must not begin by restating `term`. | "A mutex is a mutex that..." |
| E7 | **Duplicate identity.** No two Terms share an `id` within a Domain; no Alias collides with another Term's `id` or Alias. | |
| E8 | **Layer out of Domain.** `layer` must belong to one of the Term's own Domains. | |
| E9 | **Missing article file.** `article:` points at a file that exists. | |
| E10 | **Schema violation.** Frontmatter parses against `schema.ts`. | |

## Warnings — visible, not blocking

| # | Rule | Why |
|---|---|---|
| W1 | **Orphan.** A Term with no authored Edges. | It exists outside the graph, so nobody will ever find it by exploring. |
| W2 | **Redundant child.** A Term whose Edges are a subset of its `kind-of` parent's *and* whose `summary` contains the parent's name. | Granularity test 2 + 3 (ADR-0002). A prompt to merge, never an instruction. |
| W3 | **No prerequisites.** A non-foundational Term with an empty `requires`. | Lazy prerequisites flatten the graph and break learning Paths. |
| W4 | **Thin neighbourhood.** Fewer than three authored Edges. | |
| W5 | **Still a draft.** `draft: true`. Counted and reported, never merged to `main` silently. | LLM-drafted content that hasn't been edited is the single biggest quality risk. |
| W6 | **Untouched Mentions.** A Term mentioned in prose by five or more others but with no authored Edge to any of them. | A relationship the author keeps implying but never typed. |

## Reports — produced every build, block nothing

- **Coverage map**: Terms per Cluster, and Clusters with fewer than ten Terms. Doubles as
  the contributor to-do list and the honest answer to "is this dictionary finished?"
- **Depth histogram**: a graph that is all depth-0 and depth-1 means `requires` is being
  skipped.
- **Collision list**: every name serving a Disambiguation page.
- **Draft ratio** per Domain.

## Exemptions

`allowed-words.txt` holds words that are technical but will never be Terms — proper nouns,
file formats, company names, common abbreviations. It is deliberately annoying to add to:
one word per line, alphabetical, with a comment saying why. Friction here protects E1 from
becoming a rubber stamp.
