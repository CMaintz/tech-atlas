---
status: accepted
accepted: 2026-09-22
---

# Domain is a set of tags; name collisions become separate namespaced Terms

> Carried forward verbatim from `techlexicon/docs/adr/0003` [S6]. The B-vision's
> equivalent is the `TermSense` entity and the ambiguity-handling table in
> `../01_SPEC.md` §9.

Security is a launch Domain rather than a later addition, so the words that mean
different things in different fields — `token`, `agent`, `signature`, `salt`, `key`,
`nonce`, `policy`, `kernel` — have to be modelled from the first file rather than
retrofitted. We decided that `domain` is an *array* of tags on a Term, and that a
Collision is resolved by namespacing, not by merging.

- One concept that is genuinely the same in two fields (`hash-function`) is **one Term**
  tagged `[cs, security]`. Merging is the default.
- Two distinct concepts that merely share a name are **separate Terms**, living at
  `content/cs/token.md` and `content/security/token.md`. The folder is the namespace.
- The bare name `/term/token` serves a generated Disambiguation page.

## Consequences

- Every Edge target must resolve unambiguously. Lint resolves an unqualified reference
  within the referring Term's own Domain first; if the name also exists in another
  Domain, it fails and demands `security/token`. Silent cross-domain resolution would
  wire the graph wrongly in a way no reader could detect.
- The pilot content is chosen to exercise this immediately rather than defer it: a CS
  concurrency cluster and a security auth/crypto cluster, picked because they *collide*
  (`key`, `salt`, `nonce`, `token`) and because they *bridge* — a race condition in CS is
  a TOCTOU vulnerability in security, which is one concept wearing two Domain tags. Two
  pilot clusters that touch prove the model; two that don't prove nothing.
- Folders carry namespace meaning only. A Term tagged `[cs, security]` lives in one
  folder and is reachable from both Domains; the folder is not a claim of ownership.

## Implementation note (2026-09-25)

As built, Terms are YAML, not Markdown: `app/src/content/terms/cs/audit.yaml` and
`app/src/content/terms/security/audit.yaml`. The folder is still the namespace, and the
bare name is served at `/[lang]/terms/audit/` (A56). A bare name that is *not* a
Collision redirects to its one Term (A72).
