# Atlas — Authoritative v1 Specification

> **Working name:** `Atlas` (decided — `AUTONOMOUS_DECISIONS.md` A1). **Status:** decided; v1.0
> live at https://cmaintz.github.io/tech-atlas/ (see `AUTONOMOUS_DECISIONS.md` A22 for what
> remains). This is the single source of truth for v1. It supersedes the
> exploratory `00`–`09` documents (kept as the *ingestion archive*) and is built on
> the decisions recorded in [`UNIFIED_VISION.md`](./UNIFIED_VISION.md) (D1–D12) and
> the schema in [`schema.ts`](./schema.ts). Where this document and the archive
> disagree, **this document wins.**

---

## 1. What it is

**A bilingual (English + Danish) technical dictionary whose typed, sourced
relationships turn it into a navigable knowledge map — with a learning system that
later falls out of those same relationships.**

Three layers, one substrate:

- **Dictionary (primary).** Every concept has a page that defines it well and stands
  on its own. This ships first and must be excellent by itself.
- **Knowledge map (the differentiator).** Relationships between concepts are
  *authored data*, not prose hyperlinks — so the whole vocabulary can be read as a
  graph, walked as a path, and searched by relationship.
- **Learning (emergent, later).** Because relationships are typed and rich, most
  study material (quizzes, prerequisite paths) can be *generated* from the graph
  rather than hand-authored. Deferred past v1, but the data model earns it now.

**Governing principle — the relationship layer is the leverage point (D1).** One
investment — typed edges that each can carry an explanation, a confidence, and
sources — pays off three times: it *is* the map, it will generate the learning
system, and it powers relationship-aware search. Everything visual (2D/3D graph,
compare view, future spatial lenses) is a *rendering* of that one asset.

---

## 2. Who it is for

Ranked deliberately; earlier users are served first and must be served perfectly.

1. **The course student mid-lookup.** A student of the real *Cyber Security Fast
   Track* course (Danish, GRC-oriented "grey roles") who hits a term — `NIS2`,
   `residual risk`, `SIEM` — and needs the definition in seconds, in Danish, from a
   search result. Never needs to see the graph.
2. **The student building understanding.** Same person, now wanting to know what a
   term contrasts with, what it presupposes, and what it mandates or mitigates — and
   later, to test recall.
3. **The shape-of-the-field explorer.** Someone asking "where does this sit, what's
   next to it, what do I need first?" This is the user the graph exists for.

The graph is the differentiator, but lookup is the primary use. (This ranking is why
we build static term pages before graph spectacle — §11.)

---

## 3. Scope for v1

Two **co-equal** launch clusters, chosen to *collide* and *bridge* (D3, D6):

### Security — the course "Ordlisten" (~65 terms, the granularity oracle, D4)
Organised as the compendium's seven groups, each a **Cluster**:

| Cluster | Representative terms |
|---|---|
| `fundamentals` | CIA triad, confidentiality, integrity, availability, threat, vulnerability, risk, control, governance, security policy, compliance |
| `awareness` | phishing, spear phishing, social engineering, ransomware, shadow IT, nudging, human firewall, security culture |
| `controls` | CIS controls, asset inventory, access management, MFA, patch management, backup, SIEM, IDS/IPS, endpoint, Zero Trust, vulnerability scanning, penetration testing |
| `risk-management` | risk management, threat picture, critical assets, BIA, risk treatment, heat-map, residual risk, risk appetite |
| `compliance` | NIS2, minimum requirements, management responsibility, supplier management, DPA, GDPR, ISO 27001/27002, D-mærket, gap analysis, audit, PDCA |
| `incident-response` | contingency plan, BCP, DRP, table-top exercise, communication plan, lessons learned |

Granularity rule (ADR-0002, test 1): **if the ordliste lists it separately, it is a
Term.** Other candidate terms must pass the three-part test in §7.

### CS — networking + OS + identity fundamentals (~40 terms, D6)
Chosen because these are the concepts the security controls *point at*, giving real
collisions and bridges:

| Cluster | Representative terms |
|---|---|
| `networking` | network, protocol, TCP/IP, DNS, port, packet, firewall, router, VPN, endpoint |
| `os` | process, kernel, file system, permission, service, log, patch, backup |
| `identity` | authentication, authorization, credential, password, session, access control, SSO, RBAC, least privilege |

**Collisions** (same name, different meaning → namespaced Terms, ADR-0003):
`endpoint`, `policy`, `control`, `audit`, `patch`, `backup`, `port`.
**Bridges** (one concept across both domains, or a control targeting a CS concept):
`mfa` implements `authentication`; `zero-trust` builds on `identity`; `siem`
`used-with` `log`; `ids`/`ips` guard the `network`; `access-management` realises
`access-control`.

Both clusters ship **bilingual** (EN + DA). `ai` and `platform` are modelled in the
schema from day one (ADR-0003) but written later.

**v1 content target:** ~105 terms across the two domains, every one bilingual.

---

## 4. The Term (entry model)

Authored as one content file per Term (`content/<domain>/<id>.yaml`). Full schema in
[`schema.ts`](./schema.ts); shape:

| Field | Notes |
|---|---|
| `id` | kebab-case, canonical (English-based) slug; unique within Domain; the URL. |
| `term` | `{ en, da }` display name. |
| `aka` | `{ en:[], da:[] }` aliases for the *same* concept; searchable; redirect here. |
| `domain` | array of tags (`security`, `cs`, …); a Term may belong to several (ADR-0003). |
| `cluster` | the one group it is taught alongside (§3). |
| `layer` | optional facet (`network`, `identity`, `governance`, …); a colour/filter, never a position. |
| `status` | `current` \| `legacy` \| `emerging`. |
| `era` | optional year the idea entered use (powers the Timeline and the Explorer's Time layout, A41). |
| `summary` | `{ en, da }`, **≤140 chars each**, Closed Vocabulary. The lookup line and search snippet. |
| `body` | four bilingual facets, Closed Vocabulary (§5). |
| `edges` | typed relationships, authored one direction (§6). |
| `article` | optional `{ en?, da? }` long-form path; **exempt** from Closed Vocabulary (ADR-0004). |
| `sources` | ≥1 (D11). |
| `draft` | `true` until human-edited; counted every build (W5). |

### Reading a Term — three deliberate depths
1. **Summary** — one sentence, ≤140, serves lookup and the search snippet.
2. **Body** — the four facets, serves the learner (§5).
3. **Article** — optional long-form for the handful of terms that need it.

Below the Body, "what it contrasts with / requires / unlocks / mitigates / mandates"
is **generated from edges** — never a hand-maintained "see also" list.

### The Body — four facets (D8)
Each facet is `{ en, da }`, 1–3 sentences, under Closed Vocabulary:

1. **Formal** — the canonical technical definition (precise; distinct from `summary`).
2. **In plain English** — breaks circular terminology.
3. **In practice** — operational, real-world meaning.
4. **Why it matters** — why the concept exists.

The four are a template, not dogma: a facet may become optional later if it reads
formulaic on simple terms (revisit as a schema tweak, not rework).

---

## 5. The content-quality engine

The thing that keeps the leverage point *trustworthy*. This is what makes "robust
data" a guarantee rather than a hope.

### Closed Vocabulary (D7)
A `summary` or `body` facet may use **only** (a) plain everyday language, or (b)
other defined Terms (or their Aliases), or (c) words in the per-language
`allowed-words` list. Any other jargon must become its own Term or be rephrased away.

- **Enforced by lint, build-blocking, in both languages.** The course student reads
  Danish, so Danish is not second-class. (Sequencing mitigates cost: draft a cluster
  in English first to stabilise the term set + allowed-words, then bring Danish to
  the same blocking bar before v1 ships.)
- **Scoped:** binds `summary` + `body` only. **Articles are exempt** (ADR-0004) —
  long-form writing quotes specs and uses any jargon freely; auto-linking still
  harvests Mentions from it.
- **Payoff:** no jargon-defined-with-jargon; every term a definition leans on is a
  real node, so each definition *is* a set of graph edges. The map's density is real,
  not decorative.
- **`allowed-words`** (per language) is the escape hatch for technical words that
  will never be their own node (proper nouns, "email", "server", "EU"). Deliberately
  annoying to add to (one per line, alphabetical, justified) so it never becomes a
  rubber stamp.

### Lint rules (build-blocking errors)
E1 unknown jargon (Closed Vocabulary, both languages) · E2 dangling edge · E3
ambiguous cross-domain edge (must be namespaced) · E4 `requires` cycle · E5 circular
definition · E6 tautological summary · E7 duplicate identity · E8 layer out of domain
· E9 missing article file · E10 schema violation · E11 semantic vectors missing a term or
built with other model settings (run `npm run embed`).

### Warnings (visible, non-blocking)
W1 orphan (no edges) · W2 redundant child · W3 no prerequisites · W4 thin
neighbourhood (<3 edges) · W5 still a draft · W6 untouched Mentions · W8 a term's
semantic vector embeds older text (run `npm run embed`).

### Reports (every build)
Coverage map (terms per cluster; clusters under ten) · Depth histogram · Collision
list · Draft ratio per domain and language.

### Granularity test (ADR-0002)
A concept earns its own Term only if it (1) is searched alone (the ordliste / a
textbook index says so), (2) survives a standalone ≤140 summary that doesn't reduce
to "a kind of <parent>", and (3) carries an edge its parent doesn't. Otherwise it is
a paragraph in its parent, or an Alias.

### Collisions & namespacing (ADR-0003)
One concept genuinely shared across domains (`endpoint` as a device on a network) is
**one Term** tagged `[cs, security]`. Two distinct concepts sharing a name
(`policy`: a firewall rule vs a governance document) are **separate namespaced
Terms** (`cs/policy`, `security/policy`); the bare name serves a generated
Disambiguation page. Lint (E3) forbids silent cross-domain resolution.

### Content pipeline
Curated term list (the ordliste + the CS bridge list) → **LLM first draft** against
the schema → **human edit, every entry** → **lint**. `draft: true` until edited; the
draft ratio is reported loudly on every build, because rubber-stamping drafts is the
single biggest quality risk.

### Sourcing & provenance (D11)
Source tiers, best first: **standards & official texts** (NIST, ISO 27001, NIS2/GDPR,
CIS, RFCs) › **official docs** › **the course compendium** (the security oracle) ›
**reputable references** (CNCF, OWASP, Wikipedia, OSTEP/CLRS) › other. SEO blogs and
AI output are not sources. **Every Term cites ≥1 source.** Edge sources are
*encouraged* for claim-like edges (`mitigates`/`exploits`/`causes`/`mandates`),
optional for structural ones, never build-blocking. Because Closed Vocabulary forces
rephrasing into our own words, we cite for authority, not because we pasted text —
which sidesteps most copy-licensing concern.

---

## 6. The relationship model

Twelve **closed** edge types (D2, D12). Authors write **one direction only**; the
inverse is generated at build. Symmetric types are their own inverse. There is
deliberately **no `related_to` catch-all** — loose association is captured by
auto-derived **Mentions**, never authored.

| Type | Inverse | Sym | Meaning · example |
|---|---|:--:|---|
| `requires` | `unlocks` | | conceptual prerequisite; the DAG Depth is computed from. `risk-treatment` requires `risk` |
| `kind-of` | `has-kind` | | taxonomic parent. `spear-phishing` kind-of `phishing` |
| `part-of` | `has-part` | | composition. `confidentiality` part-of `cia-triad` |
| `implements` | `implemented-by` | | concrete realises abstract. `mfa` implements `authentication` |
| `contrasts-with` | — | ✓ | easily confused, meaningfully different; drives compare. `authentication` ⇄ `authorization` |
| `alternative-to` | — | ✓ | competing solution. `qualitative-risk-analysis` ⇄ `quantitative-risk-analysis` |
| `supersedes` | `superseded-by` | | replaced in practice. `nis2` supersedes `nis1` |
| `mitigates` | `mitigated-by` | | control against a weakness. `mfa` mitigates `credential-theft` |
| `exploits` | `exploited-by` | | attack against a weakness. `phishing` exploits `human-trust` |
| `causes` | `caused-by` | | failure mode. `misconfiguration` causes `data-breach` |
| `used-with` | — | ✓ | commonly combined. `siem` ⇄ `ids` |
| `mandates` | `mandated-by` | | regulation requires a control/practice. `nis2` mandates `incident-reporting` |

**Rich, first-class edges.** An edge is either a bare target (`kind-of:
[social-engineering]`) or an object carrying `why` (bilingual), `confidence` (how
sure we are it is true), an optional coarse `strength` (`primary`/`normal`/`minor` —
how central the relationship is, e.g. a primary vs partial control), and `sources`.
Cheap for structural links; explanatory and sourced for claims. A continuous edge
weight is **not** authored (it would repeat ADR-0001's hand-assigned-scalar trap);
the **visual weight** for edge thickness and force layout is *derived* at build from
edge type + endpoint degree + `strength` + `confidence`.

**Derived at build, never authored:**
- **Inverse edges** — every authored edge yields its inverse on the other Term.
- **Depth** (ADR-0001) — `depth(t) = 0` if `t` requires nothing, else `1 + max(depth
  of its requires)`. The `requires` graph must stay acyclic (E4). Depth drives the
  graph's vertical axis and path ordering; it is a build artefact, never committed.
- **Mentions** — untyped edges harvested from prose auto-links; weaker, rendered
  differently. The only "loose" relation, and it is never authored.
- **Visual weight** — per edge, derived from type + endpoint degree + `strength` +
  `confidence`; drives edge thickness, force-layout spring strength, and label
  priority. Never authored.
- **collides** — true when another Domain holds a different Term of the same name.

Adding a 13th edge type is a deliberate schema change. Deferred candidates:
`depends-on`, `abstraction-of`, `instance-of`, `example-of`, `assesses`.

---

## 7. Reading surfaces

### The Term page (primary)
The default surface and the primary learning experience. Structure: title + domain
tags + status; `summary`; the four Body facets; then generated relationship sections
(*contrasts with · requires · unlocks · mitigates/mitigated-by · mandates* …, from
edges); *Continue learning* (external resources by type); an **Explore connections**
action that opens the graph centred on this Term; "Read the full entry" for Terms
with an Article. Statically rendered, SEO-friendly, fast on a phone, bilingual with a
language toggle.

### The graph (the differentiator, not the front door)
A persistent sidebar showing the current Term's **Neighbourhood**, expandable to
fullscreen. Always present, never the only route to content; every node links to a
real, statically rendered page ("the canvas is an index, not a container").

- **2D is the default** — readable labels, precise clicking, works on a phone.
- **3D is a mode**, justified only because its vertical axis means something: Depth,
  derived from `requires` (ADR-0001) — a layered dependency graph with foundations at
  the bottom.
- Edge *family* drives colour and filtering — seven readable groups (structure,
  prerequisites, contrasts, attacks & defences, regulation, lineage, used together)
  instead of twelve raw types (A29); the exact type is shown in edge labels. *Cluster*
  drives node colour; *domain* drives filtering. Progressive: arriving from a term
  starts at the focal node + direct edges; expand one hop at a time, or open the
  whole map.
- The full-screen Explorer (`/[lang]/explorer/`) offers 2D (force, layered by
  Depth, or laid out by Time — x = `era`, undated terms in a side lane) and 3D
  (height = Depth), a route finder between any two terms, and prerequisite
  highlighting.

### Timeline (era view)
`/[lang]/timeline/` lists every Term with an `era` by decade, oldest first, coloured
by cluster, each linking to its page; a CSS-only domain filter narrows it. Terms
without an `era` are omitted and counted (A41).

### Compare / "Don't confuse" view
Driven by `contrasts-with`. Side-by-side for the pairs learners mix up
(`authentication` vs `authorization`, `ids` vs `ips`, `vm` vs `container`,
`confidentiality` vs `integrity`), on the axes that separate them.

### Index & search (static)
An A–Z / by-cluster index, and client-side search over terms, **aliases (both
languages)**, and summaries, with typo tolerance. Search also understands intents
(A39): "X vs Y" opens the comparison, "how are X and Y related" / "from X to Y" opens
the route in the Explorer, "before X" opens what to learn first.

**Semantic search (A65–A68, superseding A51–A55)** answers questions and descriptions
("how do I stop people reusing leaked passwords" → Credential stuffing), in Danish or
English and across the two. **The model runs on the backend, never in the browser.**
Every Term (name + aliases + summary + plain facet, per language) is embedded at author
time by `npm run embed` with **bge-m3** (`BAAI/bge-m3`, multilingual, 1024 dimensions) into
a committed vector file (`supabase/seed/term-vectors.json`); CI seeds it into Postgres
(pgvector, `public.term_vectors`, public read-only) next to the learner data. The lint
errors (E11) when a term is missing from the vectors or the model settings changed, and
warns (W8) when a term's text changed since it was embedded. A Supabase Edge Function,
`semantic-search` (`POST { q, lang, k }` → `{ hits: [{ id, score }] }`), embeds the query
with the same model on Cloudflare Workers AI and ranks terms by cosine in the database,
each term scoring its better language. The search box calls it — debounced, abortable —
for queries of three or more words or with no name match; lexical (names and aliases) and
semantic rankings are merged by reciprocal rank fusion, and hits found only by meaning are
labelled. There is no opt-in and no download: when the backend is not configured, errors,
or takes over 2 s, the lexical results simply stand.

### Linked prose and Mentions
Body facets link every other term at its first mention on the page (A38). Terms whose
prose names this term, but that have no typed edge to it, are listed as "Mentioned in"
— the weaker, derived relation of §6.

---

## 8. Bilingual behaviour (D5)

Every human-facing string is `{ en, da }`. English `id`s are canonical (stable slugs,
edge targets); display, summary, body, aliases and edge explanations are per-language.
A language toggle switches the reading language; search matches aliases in either
language. Closed Vocabulary and its `allowed-words` list are maintained **per
language**.

---

## 9. Learning (built — generated from the data)

Built after v1.0 (A34–A37) exactly as the data model intended: nothing is hand-authored.

- **Quizzes generated from edges** — on every term page ("Check yourself") and in
  study sessions (`/[lang]/study/`) scoped by cluster: definition → term, "easily
  confused with" (`contrasts-with`), "what comes before" (`requires`), and "what does
  X protect against / require / take advantage of" (`mitigates` / `mandates` /
  `exploits`). Wrong options come from the same cluster or domain and never include
  the question term, any valid answer, or their structural relatives and alternatives.
- **Spaced repetition** — Leitner boxes (review after 0/1/3/7/16/35 days). A right
  answer promotes a term only when it is new or due; a wrong answer resets it.
  Sessions put due reviews first.
- **Personal knowledge map** — mark each term Know / Familiar / Learning / Don't
  understand; the Explorer can colour by it; the study hub recommends terms whose
  prerequisites you already know.
- **Local-first** — learner state lives in the browser (A24) and the UI reads only
  that; signed out, offline, or on a build without accounts, everything works as before.
- **Optional accounts + synced progress** (A44–A47) — sign in with an email magic link
  or GitHub (Supabase Auth, called from the browser; the site stays static). A signed-in
  learner's state is one row in `learner_state` (Postgres, Row Level Security: own row
  only). Sync pulls and merges on sign-in, page load, returning to the tab and coming
  back online, and pushes a moment after each change. The merge is per term, pure and
  order-independent: the schedule (box, due) from the most recent answer, the status
  from the most recent change (clearing counts), right/wrong counts = the larger side.
  Change timestamps are monotonic per term and far-future ones are pulled back, so a
  fast clock can't win; writes are versioned (optimistic concurrency), so no device's
  write is silently lost. The account page (`/[lang]/account/`) shows sync status and
  can delete the synced data: the row becomes an empty tombstone that no device can
  write progress back to; other devices signed in before the delete sign themselves
  out at their next sync, and syncing resumes only when the learner chooses "Start
  syncing again".
  Accounts exist only when the build is given `PUBLIC_SUPABASE_URL` and
  `PUBLIC_SUPABASE_ANON_KEY`; setup is in `docs/SUPABASE_SETUP.md`.

---

## 10. Architecture (D9, D10)

- **Static-first.** Content files (bilingual YAML) + the Zod `schema.ts`; Closed
  Vocabulary + full lint in CI; build produces static term pages + a JSON graph
  (`{ nodes, links }`) rendered client-side. **No database, no server in v1.**
- **Framework: Astro** — a content site with one interactive graph island is its
  sweet spot; the graph island is the only heavy client-side piece.
- The whole ~105-term graph fits in memory; progressive loading and server-side graph
  queries are large-scale concerns for later.
- A database (Postgres + pgvector, or a graph DB) is **deferred** to the phase where
  learning or personalization actually need it. *Post-v1:* learner progress sync uses
  Supabase (hosted Postgres + Auth) straight from the browser (A44), and semantic search
  keeps its term vectors in the same Postgres (pgvector) behind an Edge Function (A65);
  content, pages and the graph stay static and never touch it. Both are optional: an
  unconfigured build is the fully static site, with name search only.

---

## 11. Roadmap

**v1 — the excellent bilingual dictionary that renders as a graph.**

| Step | Ships | Done when |
|---|---|---|
| 1 | `schema.ts`, lint suite, Astro build pipeline, `allowed-words` (EN+DA). | The pipeline lints and builds an empty corpus. |
| 2 | Pilot content: ~40 security terms across `fundamentals`/`awareness`/`controls` + the ~15 CS terms they bridge to, bilingual, chosen to collide. | The model survives ~55 real bilingual Terms; collisions resolve; the graph isn't a hairball. |
| 3 | Static Term pages, index, client-side search, aliases, language toggle, sidebar 2D graph, SEO. | The course student can look a term up on a phone, in Danish. **First phase with a user.** |
| 4 | Complete both clusters (~105 terms); Articles for the ~dozen terms that need them; Compare view. | Coverage map has no cluster under ten. |
| 5 | 3D mode (Depth axis), Paths, era view. | — |

**Built after v1.0:** Articles, the Explorer (2D/3D, routes, progressive neighbourhoods),
"What to learn first" paths, the learning system (§9), and the era view (Timeline +
the Explorer's Time layout), semantic search (§7), and optional accounts with synced
progress (§9), the Disambiguation page (§5, ADR-0003), lint rules E5, W2 and W3, and the
depth-histogram and collision-list reports (§5, A56–A60) — see `AUTONOMOUS_DECISIONS.md`.

**Still deferred:** AI tutor; a database for content; the `ai` and `platform`
domains; centrality/community features. Each is enabled by, not blocked on, the data model.

---

## 12. Non-goals for v1

- Not a deep-dive host — long-form lives in optional Articles or external links; the
  dictionary owns the conceptual layer, the internet owns the depth.
- Not graph-first — the term page is primary; the graph is reached through it.
- No `related_to` / untyped authored edges — meaning is mandatory.
- No hand-assigned abstraction levels — Depth is derived.
- No hand-maintained "see also" lists — relationship sections are generated.

---

## 13. Open questions

- **Working name** — `Lexicon` is a placeholder. Candidates: Atlas · Leksikon ·
  **Ordkort** · Meridian · Consilience (see the accompanying discussion).
- **Danish drafting order** — *resolved (D7):* English blocking from term one; Danish
  **advisory** (non-blocking warnings) from day one, reassessed on evidence after the
  pilot. Not ignored — warnings accumulate so we can tell if hardening is needed.
- **CS term list** — the ~40 CS terms are sketched (§3); finalise which earn a Term
  vs a paragraph via the granularity test, using textbook indexes as the CS oracle.
- **Body facet optionality** — keep four mandatory, or make `inPractice` /
  `whyItMatters` optional for simple terms? Revisit after the pilot.

---

## 14. Provenance

This spec consolidates and *decides* what the exploratory documents held as competing
options. Those documents remain, unchanged, as the ingestion archive:
- `00_README`–`09_VISUAL_DIRECTION` — the three source conceptions, preserved.
- `UNIFIED_VISION.md` — the dated decision log (D1–D12) this spec is built from.
- `schema.ts` — the machine-readable schema this spec describes.
- `adr/0001`–`0004` — the architecture decision records still in force.
Where any of them disagrees with this document, **this document wins.**
