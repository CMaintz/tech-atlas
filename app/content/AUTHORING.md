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
deepDive: # optional — see "Technical deep dive" below
  en: |
    First paragraph …

    Second paragraph …
  da: |
    …
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

## Technical deep dive (optional)

`deepDive: { en, da }` is the expert-level explanation shown as **Technical deep
dive** on the term page, after the four facets (A80). Both languages are required
when the field is present.

- **Plain text**, no Markdown or HTML. Separate paragraphs with a blank line (use a
  YAML block scalar, `en: |`); single line breaks inside a paragraph are joined.
- **Exempt from Closed Vocabulary** (like an Article): name protocols, standards,
  algorithms and products precisely. Terms it names are still auto-linked.
- Go deeper than the facets — mechanisms, variants, failure modes, the specifics a
  practitioner needs — and keep every claim traceable to the term's `sources` (add a
  source rather than state something unsourced).
- Usually 2–5 paragraphs. Longer narrative with history and worked scenarios belongs in
  an Article.

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

# Authoring questions (the question bank)

Hand-written questions sit beside the quizzes generated from the graph (A83). Schema:
`Question` / `QuestionFile` in `src/schema.ts`; rules: `src/lib/question-rules.ts`.

## File

- Path: `src/content/questions/<folder>/<cluster>.yaml` — `<folder>` is the folder
  the cluster's terms live in (`security`, `cs`, `ai`, `platform`); `<cluster>` is the
  manifest cluster. One file per cluster, a top-level `questions:` list.
- Block-style YAML, as for terms. Use folded scalars (`en: >-`) for long text.
- Questions are **exempt from Closed Vocabulary** — write as a practitioner would.

## Fields (all required)

```yaml
questions:
  - id: gdpr-breach-72-hours # kebab-case, unique across the whole bank, never reused
    terms: # what it tests (≥ 1), always `domain/id`; the answer updates each one
      - security/incident-reporting
      - security/gdpr
    kind: scenario # scenario | concept | compare | order | true-false
    stem: { en, da } # the question
    options: # exactly 4 — or exactly 2 for true-false: True/Sandt, then False/Falsk
      - en: ...
        da: ...
    answer: 0 # index of the single best option (0-based); the UI shuffles options
    explanation: { en, da } # why it is right AND why the tempting wrong ones are wrong
    difficulty: 2 # 1 = basic, 2 = applied, 3 = expert
    sources: # at least one, same tiers as terms; real sources you have checked
      - title: GDPR (Regulation (EU) 2016/679), Article 33
        url: https://eur-lex.europa.eu/eli/reg/2016/679/oj
        tier: standard
    draft: true # ALWAYS true — a human flips it after review
```

See `src/content/questions/security/incident-response.yaml` for a full example.

## Writing good questions

- **Test understanding, not the wording of a definition.** Prefer `scenario`: a
  concrete situation in a Danish workplace ("En medarbejder i kommunen modtager …",
  "A clerk at a Danish municipality …") where the learner must apply the idea.
- **One unambiguous best answer.** No trick questions, no "all of the above", no
  double negatives. If an expert could argue for two options, rewrite.
- **Plausible distractors**: common misconceptions, a neighbouring concept, the
  right idea with the wrong number. Keep options similar in length and form.
- **Explain**: say why the answer is right, then why each tempting option is wrong.
- **Research every fact** — article numbers, deadlines, amounts, control counts —
  and cite where you checked it. Prefer the law text (EUR-Lex, retsinformation.dk),
  the standard, or an official authority (Datatilsynet, Styrelsen for
  Samfundssikkerhed, ENISA, NIST) over secondary sources.
- **Danish is natural Danish**, not a word-for-word translation; both languages ask
  the same question with the same answer.
- `order` questions: each option is a whole sequence ("Identify → Analyse → …").
- `compare` questions: tag both terms being compared.

## How questions are used

- A term page's and the Explorer panel's **Check yourself** show hand-written
  questions tagged with the term first, then generated ones — **except** a question
  whose correct option _is_ that term's name (or alias): a question answered by the
  page's own term tests nothing there (A79). It still appears on the other tagged
  terms' pages and in study sessions. So tag the terms a question is _about_; when the
  answer is a term name, also tag a term the scenario is about, or no page shows it
  (lint W10).
- **Study sessions** prefer a term's hand-written question when it is new or due
  (each question keeps its own spaced-repetition record, by `id`), else a generated one.

## Lint

Errors: Q1 schema (shape, 4/2 options, answer in range, both languages) · Q2 duplicate
id · Q3 unknown or repeated term id · Q4 answer index · Q5 blank text · Q6 two options
read the same · Q7 the stem names the correct option · Q8 explanation under 80
characters · Q9 true-false options not True/Sandt, False/Falsk. Warnings: W9 file not
named after a cluster · W10 no term page can show the question.
