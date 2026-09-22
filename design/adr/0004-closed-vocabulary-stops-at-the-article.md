---
status: accepted
accepted: 2026-09-22
---

# Closed Vocabulary binds Summary and Body, but not Articles

> Carried forward verbatim from `techlexicon/docs/adr/0004` [S6]. Closed Vocabulary
> is unique to the Lexicon conception; the B-vision has no equivalent constraint —
> see the divergence table in `../00_README.md`.

Closed Vocabulary — the rule that a definition may use only plain English plus other
Terms — is what guarantees the graph's edges are real and that no entry defines jargon
with jargon. But it cannot survive contact with long-form writing: an Article on TLS
needs to name things that will never warrant their own Term, quote specifications, and
walk through code. Applying the rule there would either strangle the writing or bloat
the dictionary with Terms nobody wants.

So the constraint is scoped: **lint enforces Closed Vocabulary on `summary` and the Term
Body, and exempts Articles entirely.** Auto-linking still runs over Articles, so they
keep feeding Mentions back into the graph.

## Consequences

- Articles live in their own files (`content/<domain>/articles/<id>.md`), referenced from
  the Term's frontmatter. Term files stay short and skimmable, which is what the graph
  and the lookup case need.
- The strict layer stays small enough that the "add the Term or rephrase" demand is
  reasonable. If Closed Vocabulary applied everywhere, the pressure to grant Term status
  to passing mentions would quietly destroy ADR-0002's granularity test.
- There are two reading modes by construction: look it up (Summary, seconds) and learn it
  (Body then Article, minutes to an hour).
