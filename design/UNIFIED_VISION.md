# Unified Vision — working draft

Status: **living document**, assembled through conversation as we unify the three
source conceptions (Lexicon / TechLexicon / Atlas — see `00_README.md`) into one
coherent product. Started 2026-09-20. Each decision below is dated and will feed
the eventual rewrite of the `design/` set (and the cut/keep pass over the
divergence table).

---

## The one-line synthesis (so far)

> An excellent, disciplined technical **dictionary** whose typed, described, sourced
> **relationships** turn it into a navigable **knowledge map** — with a **learning
> system generated from those same relationships**.

Center of gravity: **the dictionary is primary** (it must be excellent on its own
and it ships first); the **knowledge-map is the differentiator it grows into**;
**learning is emergent** from the relationship data.

Governing principle: **the relationship layer is the leverage point of the whole
system.** One investment — typed edges that each carry a description, a confidence,
and sources — pays off three times: it *is* the map, it generates most of the
learning system, and it powers relationship-aware search. Everything visual (3D,
spatial lenses, bridge-finding, adaptive quizzes) is a *rendering* of that asset.

---

## Decisions locked

### D1 — Center of gravity: dictionary-primary, map-differentiator, learning-emergent  ·  2026-09-20
- The **dictionary/data is what we build first** (map-first in *identity* was
  considered, but the map dies without the data, so build order is **data-first**).
- The dictionary must **stand alone as an excellent product** and **ship first**;
  the graph and learning layers are added on top of solid content.
- The knowledge-map remains the founding differentiator — the reason this isn't
  "just another glossary" — but it is a *payoff* of the data, not a prerequisite.
- Learning is treated as **largely generatable from the relationship graph** (both
  source families independently reached this), which is the argument for
  over-investing in relationship quality rather than hand-authoring learning content
  first. Hand-curated quizzes/tutorials remain a later addition.

### D2 — Relationship model: curated closed set + rich edges  ·  2026-09-20
- A **deliberately chosen, closed, versioned** set of relationship types
  (~12–16), with the Lexicon's discipline: adding a type is a real decision;
  inverses are **auto-derived** from a one-way authored edge.
- **But** every edge is a **first-class object** carrying `description` +
  `confidence` + `sources` (the B-vision's contribution).
- This is the explicit synthesis of the two strongest experiments: disciplined
  *and* explanatory. The exact type list is TBD (a cut/keep task — reconcile the
  9-type closed set, the 14-type set, and the 17-type sets in `02_SCHEMA.md` §1).
- **No `related_to` / catch-all fallback.** An untyped type contradicts the
  every-edge-means-something thesis and rots the graph. The genuine "loosely
  related" need is served by **Mentions** — untyped edges *auto-derived* from prose
  auto-links, rendered weaker and separately (never authored). When no type fits, an
  author uses the nearest real type or *deliberately* proposes a new one; they never
  reach for a catch-all.

---

### D3 — Launch scope: anchor to a first user + two colliding domains (CS + Security)  ·  2026-09-20
- v1 **anchors to a concrete first user** whose need grounds scope, and whose
  syllabus/glossary is the **granularity oracle** (the thing that decides "own term
  vs paragraph"). Candidate from the sources: a **cybersecurity-course reader** —
  *pending confirmation that this is a real person/course, or substitution of a
  different real first user.*
- **Launch CS + Security together.** Chosen because they **collide**
  (`token`/`key`/`salt`/`nonce` → forces the namespaced-collision model, ADR-0003,
  to prove itself immediately) and **bridge** (race-condition ↔ TOCTOU, unbounded
  buffer ↔ buffer overflow → the map's most valuable cross-domain edges).
- **Concrete v1 content target (revised):** security = the course ordliste (~65
  terms, D4). **Co-equal CS cluster confirmed (2026-09-20)** — a full CS cluster
  ships alongside security in v1 (roughly doubles v1 content; cost accepted). The
  original "concurrency + auth/crypto" pilot is **dropped** (this course has no
  crypto); *which* CS cluster best bridges/collides with this GRC vocabulary is open
  below.
- **Update:** the first user & oracle are now confirmed (D4), and they reshape the
  *security* side of this pair — the real vocabulary is GRC, not auth/crypto.

### D4 — First user & granularity oracle: CONFIRMED (real course)  ·  2026-09-20
- **The first user is real:** a student of the **"Cyber Security Fast Track"**
  course — a 6-week Danish course (contacts at happy42.dk) aimed at **"grå roller"
  / grey roles**: the generalist/coordinator space between tech, management,
  organisation and communication. **GRC-flavoured, not deep-technical.** Eight
  modules: fundamentals → awareness → NIS2/ISO 27001 → CIS controls → risk
  management → hands-on SIEM (Campfire/SAGA) → incident/continuity → D-mærket.
- **The oracle is the compendium's "Ordlisten"** (~65 terms in 7 thematic groups),
  source: `Syllabus etc/Kursuskompendium.pdf` (extracted to
  `_ingest/kursuskompendium.txt`). Groups: (1) basic concepts, (2) people/culture/
  awareness, (3) controls & technical basics, (4) risk management, (5) compliance &
  law, (6) contingency & incidents, (7) extra practical.
- **Bonuses:** the 7 groups map onto **Clusters**; the definitions are already
  Summary-length plain language (validates the entry shape); and the definitions
  imply typed relationships (e.g. NIS2 `requires` risk-mgmt/awareness/incident-
  handling; spear-phishing `kind-of` phishing; 2FA/MFA are aliases; CIA-triad
  `has-part` confidentiality/integrity/availability). The graph half-writes itself.
- **This is the security-domain v1 term list.** Granularity rule (ADR-0002 test 1):
  if the ordliste lists it separately, it is a Term.

### D5 — Product language: fully bilingual (English + Danish)  ·  2026-09-20
- Every entry maintains **both English and Danish** — the term name *and* the
  definitions (one canonical concept, two languages). Serves the Danish course
  student in their own material *and* the broader (English) CS/AI/platform vision.
- **Schema implication:** language-keyed fields (e.g. `term.{en,da}`,
  `summary.{en,da}`, `body.{en,da}`), not single strings; `aka` becomes per-language.
- **Cost accepted:** ~2× definition authoring per term.
- **Interaction to watch:** if Closed Vocabulary is adopted (open item), it must
  hold in *both* languages — per-language allowed-words list and lint, doubling the
  discipline. Revisit when we decide the content engine.

### D6 — CS cluster for v1: networking + OS + identity fundamentals  ·  2026-09-20
- The co-equal CS cluster is **networking + operating-system + identity/access
  fundamentals** — the concepts the security controls actually reference, giving
  real **collisions** (endpoint, policy, control, audit, patch, backup differ in CS
  vs security) and real **bridges** (MFA↔authentication, Zero Trust↔identity/
  segmentation, SIEM↔logging, IDS/IPS↔networking, firewall, access control). Not
  concurrency (whose crypto counterpart is gone).

### D7 — Content engine: Closed Vocabulary, fully enforced, both languages (scoped)  ·  2026-09-20
- **Closed Vocabulary binds Summary + Body** (Articles exempt, ADR-0004): a
  definition may use only plain language + other *defined terms*, or entries in a
  per-language `allowed-words` list. Lint **blocks the build** (rule E1) in **both
  English and Danish** — the real first user reads Danish, so Danish content cannot
  be second-class.
- Full lint suite applies (dangling/ambiguous edges, `requires`-cycles, tautological
  summaries — `02_SCHEMA.md` §6). Pipeline: curate → LLM draft → human edit → lint;
  `draft: true` until edited; draft ratio reported each build (W5).
- **Danish enforcement — advisory first, decided on evidence (2026-09-22):** English
  is blocking from term one; **Danish runs advisory (non-blocking warnings) from day
  one** — *not* ignored, so violations accumulate as a visible to-fix list rather than
  silent debt. Reassess after the pilot cluster: if Danish stays naturally clean
  (likely — security Danish is largely English loanwords + the ordliste seeds plain
  definitions), flip it to blocking cheaply; if messy, we'll have the evidence to
  decide. English being canonical + blocking already guarantees every edge is real,
  so advisory Danish never compromises the map's honesty — it only monitors Danish
  *prose* quality until we choose.
- **Consequence:** two launch clusters = a sparse vocabulary, so definitions must
  bottom out in defined terms + plain language; expect heavy early reliance on
  `allowed-words` (×2 languages).

### D8 — Entry shape: fully faceted Body  ·  2026-09-21
- Entry = `id` · `term{en,da}` · `aka{en,da}` · `domain[]` · `cluster` · `layer?` ·
  `status` · `era?` · `summary{en,da}` · **`body` (4 facets)** · `edges` (rich) ·
  `article?` · `sources` · `draft`.
- **Body is fully faceted** — four mandated parts, each `{en,da}`, each under Closed
  Vocabulary:
  1. **Formal** — canonical technical definition (precise; distinct from the ≤140
     `summary` lookup line, so no duplication).
  2. **In plain English** — breaks circular terminology.
  3. **In practice** — operational / real-world meaning.
  4. **Why it matters** — why the concept exists.
- Keep facets short (1–3 sentences each); real depth goes to the optional Article.
- **Cost (accepted):** 4 facets × 2 languages + 2 summaries per term. Mitigations:
  the ordliste seeds Danish plain definitions for security; `Formal` ≈ a tightened
  `summary`; the LLM-draft-then-human-edit pipeline does the first pass.
- **Revisable (user note, 2026-09-21):** the four facets are a template, not dogma.
  If some read formulaic on simple terms, make a facet optional (or fold `Formal`
  into `summary`) later — a schema/policy tweak, not rework. Four mandated for now.

### D9 — Build model: static-first (files + build)  ·  2026-09-21
- v1 is a **static site**: bilingual content data/frontmatter files + Zod schema;
  Closed Vocabulary + full lint in CI; build → static term pages (SEO for the lookup
  user) + a JSON graph rendered client-side. **No database, no server for v1.**
- The graph is a build artifact (JSON `{nodes, links}`), held client-side (~130
  terms is trivial in memory; progressive loading is a large-scale concern for later).
- A database (Postgres+pgvector / graph DB) is **deferred** to the phase where
  learning, personalization, or semantic search actually need it (V2/V3).
- **Framework:** Astro recommended (content site + interactive graph island = its
  sweet spot); pending confirmation.

### D10 — Framework: Astro  ·  2026-09-21
- **Astro** (content-heavy static site + one interactive graph island). New to the
  user; adopted to try. Reversible.

### D11 — Sourcing & provenance policy  ·  2026-09-21
- **Source tiers** (best first): standards & official texts (NIST, ISO 27001, NIS2/
  GDPR, CIS, RFCs) › official vendor/project docs › the **course compendium** (the
  oracle for security) › reputable references (CNCF, OWASP, Wikipedia, OSTEP/CLRS) ›
  other. SEO blogs and AI output are **not** sources.
- **Requirement:** every Term cites **≥1 source** (compendium counts for security).
  Edge sources **encouraged for claim-like edges** (mitigates/exploits/causes),
  optional for structural ones; **never build-blocking**.
- **Licensing:** Closed Vocabulary forces rephrasing into our own words, so we cite
  for authority, not because we pasted text — sidesteps most copy-licensing concern.

### D12 — The curated closed edge set: 12 types (resolves D2's TBD)  ·  2026-09-21
- `requires⇄unlocks` · `kind-of⇄has-kind` · `part-of⇄has-part` ·
  `implements⇄implemented-by` · `contrasts-with`(sym) · `alternative-to`(sym) ·
  `supersedes⇄superseded-by` · `mitigates⇄mitigated-by` · `exploits⇄exploited-by` ·
  `causes⇄caused-by` · `used-with`(sym) · **`mandates⇄mandated-by`**.
- `mandates` is the GRC-specific addition (regulation → required practice), the
  spine of the compliance modules. **No `related_to`** (D2).
- Deferred candidates: depends-on, abstraction-of, instance-of, example-of,
  assesses/measures. Encoded in `design/schema.ts`.

### D13 — Edge salience & visual weight  ·  2026-09-21
- **No authored continuous weight** (it repeats ADR-0001's hand-assigned-scalar trap).
  Split into two:
  - Optional coarse **`strength`** on rich edges (`primary`/`normal`/`minor`, default
    normal) — authored only where relationship strength is genuinely part of the data
    (primary vs partial control, hard vs soft prerequisite). Distinct from
    `confidence` (truth, not strength).
  - **Visual weight is derived** at build (edge type + endpoint degree + strength +
    confidence) → edge thickness, force-layout spring strength, label priority.
- Delivers richer graph patterns and real semantic signal without inconsistent
  hand-numbers. Encoded in `schema.ts`.

---

## Open — next up (in rough dependency order)

1. ✅ **RESOLVED (D6):** CS cluster = networking + OS + identity fundamentals.
2. ✅ **RESOLVED (D7):** Closed Vocabulary adopted, fully enforced in both
   languages, scoped to Summary+Body.
3. ✅ **RESOLVED (D8):** entry shape fixed; Body fully faceted (Formal / plain
   English / in practice / why it matters), all bilingual.
4. ✅ **RESOLVED (D7 pipeline + D11 sourcing):** curate→LLM→human→lint pipeline;
   tiered sources; ≥1 source per term.
5. ✅ **RESOLVED (D9):** static-first (files + build → static pages + JSON graph);
   database deferred. Framework: **Astro** recommended (pending your nod).
6. **Working name** — Lexicon / TechLexicon / Atlas / something new.
7. **Then:** the full cut/keep pass over the divergence table, and the rewrite of
   the `design/` set into a single authoritative spec.
