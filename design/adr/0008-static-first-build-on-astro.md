---
status: accepted
accepted: 2026-09-22
---

# Static-first build on Astro; database deferred

The broader vision proposed a database-backed platform (PostgreSQL + pgvector, or
Neo4j) and prototyping both against graph queries. We had to choose v1's build model.
(Decisions D9, D10.)

## Decision

**Static-first.** Content is authored as bilingual files validated by the Zod
`schema.ts`; Closed Vocabulary and the full lint suite run in CI; the build produces
static term pages plus a JSON graph (`{ nodes, links }`) rendered by a client-side
island. **No database and no server in v1.**

**Framework: Astro** — a content-heavy static site with a single interactive graph
island is precisely its sweet spot.

A database (PostgreSQL + pgvector, or a graph DB) is **deferred** to the phase where
learning, personalization, or semantic search actually need it.

## Considered options

**A. Database from the start (PostgreSQL + pgvector).** Rejected for v1: it mostly
solves problems v1 doesn't have yet — semantic search, large-graph queries, user
progress — at real operational cost.

**B. Prototype both databases first** (the original plan: Postgres-first vs
graph-first against five queries). Rejected: a detour that delays real content, and
the content engine (Closed Vocabulary + lint) is a file/CI pipeline regardless of the
eventual store.

**C. Static-first on Astro.** Chosen.

## Consequences

- The content engine *is* a static file + lint pipeline — aligned with ADR-0009.
- The ~105-term v1 graph fits in memory client-side; progressive loading and
  server-side graph queries are later-scale concerns.
- Excellent SEO for the primary lookup user; cheap to host (static CDN).
- A database slots in cleanly at the learning/personalization/search phase with no
  rework of the authored content.
