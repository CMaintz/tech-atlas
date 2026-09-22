# Authoring a Term

The rules every Term file follows. Schema: `src/schema.ts`. Spec: `../../design/SPEC.md`.

## File

- Path: `src/content/terms/<folder>/<id>.yaml` — `<folder>` is `security` or `cs`
  (the top-level key the id sits under in `content/manifest.yaml`).
- **Block-style YAML only** — no inline `{ ... }` maps or `[ ... ]` lists of maps
  (prettier rewrites them). Inline lists of plain strings (`[a, b]`) are fine.
- Edges may **only** target ids in `content/manifest.yaml`. The id `audit` exists in
  both domains — always write `security/audit` or `cs/audit`.

## Fields (all required unless noted)

```yaml
term:
  en: Phishing
  da: Phishing
aka: # other names for the SAME concept, per language
  en: []
  da: []
domain: [security] # use the manifest's `domain` if given, else the folder
cluster: awareness # the manifest cluster
layer: people # optional; must be a layer of one of the term's domains
status: current # current | legacy | emerging
summary: # ONE sentence, ≤140 characters per language
  en: ...
  da: ...
body: # four facets, 1–3 sentences each, per language
  formal: { en/da } # precise technical definition (not a copy of summary)
  plain: { en/da } # an everyday analogy a layperson gets
  inPractice: { en/da } # one concrete scenario ("A finance clerk receives...")
  whyItMatters: { en/da } # the stakes — why the concept exists
edges: { ... }
sources: # at least one
  - title: Cyber Security Fast Track — Ordliste
    tier: course-material
draft: true # ALWAYS true — a human flips it after review
```

Layers — security: network, host, application, data, identity, people, governance.
CS: hardware, architecture, os, runtime, network, identity, language, framework,
application, theory.

## Writing

- **Closed Vocabulary:** summary and body use only plain everyday language plus the
  names of other manifest terms. If you need a technical word that is neither,
  rephrase it away. Never define jargon with jargon.
- The four facets must each do a **different** job. If two read alike, rewrite.
- Summary must not start by restating the term ("Phishing is phishing that…").
- Danish must be natural, idiomatic Danish (not word-for-word). Keep established
  English loanwords (MFA, SIEM, Zero Trust, NIS2) where Danes use them.
- Source tiers: `standard` (NIST, ISO, NIS2/GDPR text, CIS, RFCs), `official-doc`,
  `course-material` (the ordliste), `reference` (OWASP, CNCF, Wikipedia),
  `textbook` (OSTEP, Tanenbaum, Kurose & Ross).

## Edges

Twelve types, authored **one direction only** (inverses are generated):

| Type             | Direction / meaning                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `requires`       | this → something that must be understood first. Point toward **more foundational** terms; never create a loop. |
| `kind-of`        | this → its broader parent (`spear-phishing` kind-of `phishing`)                                                |
| `part-of`        | this → the whole it belongs to (`confidentiality` part-of `cia-triad`)                                         |
| `implements`     | concrete → abstract it realises (`mfa` implements `authentication`)                                            |
| `contrasts-with` | symmetric; easily confused, meaningfully different                                                             |
| `alternative-to` | symmetric; competing solution to the same problem                                                              |
| `supersedes`     | newer → older it replaced                                                                                      |
| `mitigates`      | control → weakness/attack it reduces                                                                           |
| `exploits`       | attack → weakness it abuses                                                                                    |
| `causes`         | cause → consequence                                                                                            |
| `used-with`      | symmetric; commonly combined                                                                                   |
| `mandates`       | regulation/standard → practice it requires                                                                     |

- **Symmetric types** (`contrasts-with`, `alternative-to`, `used-with`): author them
  only on the term whose id sorts **first alphabetically**, to avoid duplicates.
- Aim for **3–5 edges** per term. Rich form when the link is a claim:

```yaml
edges:
  kind-of: [social-engineering]
  mitigates:
    - to: phishing
      why:
        en: ...
        da: ...
      strength: primary # primary | normal | minor
      confidence: high # high | medium | low
```

## Articles (optional long-form)

Only for terms that genuinely need more than the four facets. Exempt from Closed
Vocabulary (ADR-0004) — write freely, quote specifications, use any jargon.

- One file per language: `src/content/articles/<folder>/<id>.<lang>.md`
- Frontmatter:

```yaml
---
title: NIS2 in practice
term: security/nis2
lang: en
---
```

- Link it from the term file:

```yaml
article:
  en: src/content/articles/security/nis2.en.md
  da: src/content/articles/security/nis2.da.md
```

Lint E9 fails the build if a referenced article file does not exist.
