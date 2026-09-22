---
status: accepted
accepted: 2026-09-22
---

# A curated, closed set of rich, first-class edges

The sources offered four relationship vocabularies (9 / 14 / 17 / 18 types), some
with a `related_to` catch-all. We needed one set, and had to decide how much metadata
an edge carries and how relationship *strength* is represented. (Decisions D2, D12,
D13.)

## Decision

- **A curated, closed set of 12 edge types** (`schema.ts`), each with a
  build-generated inverse; authors write **one direction only**. Symmetric types are
  their own inverse. The set adds `mandates` (regulation → required practice) for the
  GRC domain.
- **Edges are first-class objects.** A rich edge carries an optional bilingual `why`,
  a `confidence` (how sure we are it is *true*), an optional coarse `strength`
  (`primary`/`normal`/`minor` — how *central* the relationship is), and `sources`. A
  bare target string is allowed for the common structural case.
- **No `related_to` / untyped authored edge.** Loose association is captured only by
  auto-derived **Mentions**.
- **No authored continuous weight.** Visual weight (edge thickness, layout, label
  priority) is **derived** at build from type + endpoint degree + strength +
  confidence.

## Considered options

**A. Minimal closed set (9, the Lexicon's).** Rejected: too coarse to make the map
expressive or to power nuanced learning/search; misses GRC relations like `mandates`.

**B. Rich open set (17–18) with a `related_to` fallback.** Rejected: the catch-all
quietly flattens the graph and becomes a dumping ground, contradicting the
every-edge-means-something thesis; also legend/colour bloat.

**C. Curated closed set (12) + rich first-class edges.** Chosen.

On strength: an **authored continuous weight** was rejected — it repeats ADR-0001's
hand-assigned-scalar trap (subjective, inconsistent, argument-generating). A **coarse
`strength` enum + derived visual weight** was chosen.

## Consequences

- Adding a 13th type is a deliberate schema change (each type costs a colour, filter,
  legend entry and authoring decision). Deferred candidates: `depends-on`,
  `abstraction-of`, `instance-of`, `example-of`, `assesses`.
- Inverses, Mentions, Depth and visual weight are all build artefacts, never authored.
- Per-edge `why` + `sources` make the graph explainable and evidenced, not a
  collection of AI-generated guesses.
