---
status: accepted
accepted: 2026-09-22
---

# Bilingual by construction (English + Danish)

The product is anchored to a Danish-reading first user (a student of the *Cyber
Security Fast Track* course), while the broader ambition (CS, AI, platform) is
English-centric. We had to choose the language model up front, because it shapes the
schema. (Decision D5.)

## Decision

**Fully bilingual.** Every human-facing string is `{ en, da }` — `term`, `aka`,
`summary`, all four `body` facets, and edge `why`. English `id`s are canonical
(stable slugs and edge targets); the languages diverge only in display and prose.
Closed Vocabulary and the `allowed-words` list are maintained **per language**.

## Considered options

**A. English canonical + Danish aliases only** (English definitions; Danish names
searchable). Rejected: the real first user *reads Danish*, so English-only definitions
make the anchor user second-class.

**B. Danish-first** (Danish definitions; English as aliases). Rejected: narrows the
broader vision and makes later English expansion a re-authoring job.

**C. Fully bilingual.** Chosen, accepting ~2× definition authoring per term.

## Consequences

- Language-keyed fields throughout; the schema is bilingual from day one.
- The Closed Vocabulary discipline doubles (per-language `allowed-words` + lint) —
  mitigated by Danish advisory-first (ADR-0009).
- Search matches aliases in either language; a language toggle switches the reading
  language.
- Danish security vocabulary is largely English loanwords (MFA, SIEM, Zero Trust,
  NIS2, GDPR), which softens the cost; the course ordliste already seeds plain Danish
  definitions for the security cluster.
