---
status: accepted
accepted: 2026-09-22
---

# Closed Vocabulary enforced in both languages, Danish advisory-first

Extends **ADR-0004** (Closed Vocabulary binds Summary + Body, exempts Articles). Going
bilingual (ADR-0007) raised a new question: does the rule hold in Danish too, and how
strictly — given it doubles the discipline exactly when the vocabulary is sparsest?
(Decision D7.)

## Decision

Closed Vocabulary is enforced in **both** languages, but **staged**:

- **English is build-blocking from term one** (lint rule E1).
- **Danish runs advisory** — non-blocking warnings — **from day one**. Not ignored:
  violations accumulate as a visible to-fix list.
- **Reassess on evidence after the pilot cluster.** If Danish stays naturally clean,
  flip it to blocking cheaply; if it is messy, decide with real data in hand.
- `allowed-words` lists are maintained **per language**.

## Considered options

**A. Danish blocking from term one.** Rejected initially: doubles the bootstrapping
friction precisely when few terms are defined and the `allowed-words` list is
immature.

**B. Danish ignored until the end, then decided.** Rejected: retrofitting the rule
onto hundreds of existing Danish definitions is the classic "a rule added after 400
terms never goes green" failure — silent debt.

**C. Danish advisory-first, evidence-based hardening.** Chosen.

## Consequences

- The graph's edges are guaranteed real from day one by the **blocking English** side
  (English is canonical), so advisory Danish never compromises the map's honesty — it
  only monitors Danish *prose* quality.
- Danish is gated by choice, not by default; hardening it to blocking is a one-line
  policy flip once the evidence is in.
- Per-language `allowed-words` lists and lint passes.
- This is expected to be cheap in practice: Danish security vocabulary is largely
  English loanwords, and the ordliste seeds plain Danish definitions.
