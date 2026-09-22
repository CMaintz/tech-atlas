---
status: accepted
accepted: 2026-09-22
---

# Dictionary-primary; the relationship layer is the leverage point

The three source conceptions ranked the product's three layers — dictionary,
knowledge-map, learning — differently. We had to fix the centre of gravity first,
because it cascades into schema, architecture and roadmap. (Decision D1.)

## Decision

- **The dictionary is primary.** Every concept has a page that stands on its own; it
  must be excellent by itself, and it ships first.
- **The knowledge-map is the differentiator it grows into** — the founding idea and
  the reason this is not "just another glossary" — but it is a *payoff* of the data,
  not a prerequisite.
- **Learning is emergent**, generated from the relationship graph, and deferred past
  v1.
- **The relationship layer is the single leverage point.** One investment — typed
  edges that each can carry an explanation, a confidence, and sources — is
  simultaneously the map, the seed of the learning system, and the engine of
  relationship-aware search. Everything visual is a *rendering* of that one asset.

## Considered options

**A. Knowledge-map first (the graph is the hero).** Rejected *as the build-order
driver*: the map dies without robust, typed, sourced data, so building the
map/platform first risks a gorgeous hairball wrapped around thin content. Retained as
the product's *identity / north star*.

**B. Learning-system first.** Rejected: it presupposes content and relationships that
don't yet exist; learning sits downstream of both.

**C. Dictionary-primary, map-differentiator, learning-emergent.** Chosen.

## Consequences

- Build order is **data-first even though the pitch is map-first**.
- Term pages are the primary surface; the graph is reached *through* them, never the
  front door.
- Investment concentrates on relationship quality; 3D, spatial lenses, compare and
  learning are renderings of it.
- Content-quality discipline (ADR-0009) becomes non-negotiable — a map built on
  sloppy edges is worse than no map, because it is confidently wrong.
