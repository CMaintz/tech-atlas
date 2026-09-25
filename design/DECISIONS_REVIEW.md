# Decisions & assumptions review

Refreshed 2026-09-25 against `origin/main` at `b5c0f5b` (419 terms, PRs #1-#56 merged,
#57 open). First version: 2026-09-23 at `1a2bdda` (255 terms, PRs #1-#12, decisions up to
A55). Nothing in this document changes code or content. It is the agenda for one sit-down
review of everything the AI decided or assumed while building Atlas without you.

---

## 0. What changed since the first version

- **39 new logged decisions (A56-A94) plus A93a** (PR #57, still open), and **seven new
  PR-only decisions (P10-P16)**. About half of the new rows implement something you asked
  for in your feedback log; for those, only the agent's *implementation* choices are up
  for review (marked **Owner-driven**).
- **A new §2.2** lists the decisions you made yourself since then (from your feedback
  log). They are **approved, not up for review**: backend semantic search, only-owner
  merges, floating control bar, stable map, light theme, no em-dashes, privacy
  controller, LinkedIn sign-in, hidden email sign-in, and more.
- **Superseded**: A51-A55 (in-browser semantic search) by A75-A78; A41 by A81 (timeline);
  A61's motion by A85 (tour); A74's layout/flow/3D by A86; A86's sidebar by A93, then
  A93a; A86's "seams" (shared terms facing the other domain) removed on your request;
  A92's "night map" rule is being overridden by your "light theme covers everything"
  (branch `feat/light-theme-complete`, not yet a PR); A64's "no light theme" by A92;
  A3's "MIT covers content" by A66; A18 (E5 deferred) by A58.
- **Resolved from the first agenda**: the approved-but-unbuilt items (Disambiguation page,
  E5, W2, W3, reports), deploy gated on the gate (A65), Dependabot (A67), SEO basics
  (A68), open data (A69), doc refresh (A70), CSP (A89), privacy page (A88), clusters under
  ten (PR #15), light theme (A92), merge authority (you: only the owner merges).
- **What grew**: 255 → 419 terms; every term now has an AI-written **technical deep dive**
  in both languages; **180 AI-drafted quiz questions**; a **second backend vendor**
  (Cloudflare Workers AI); accounts are **live** (GitHub + LinkedIn); still **0 items
  reviewed by a human**.
- **New in §4/§5**: Cloudflare as a second vendor, the dependency on Supabase's legacy API
  keys, pg_cron, CSP trade-offs, rate-limit budgets, how the question bank and deep dives
  were researched, two Explorer renderers side by side.
- **§7 agenda rewritten** for your first read.

---

## 1. How to use this doc

- **§2** lists what you already approved: ADRs 0001-0009, D1-D13 (§2.1) and your
  decisions from the feedback log since then (§2.2). Not up for review unless you want
  to reopen something. Drift from an approved decision is noted.
- **§3** is every logged autonomous decision (A1-A94, A93a, the "Batch 4" bullets as
  **B4.1-B4.7**) plus decisions stated only in PR bodies (**P1-P16**). Each has a
  **Discuss?** flag: **High** = worth talking through, **Med** = a quick yes/no,
  **Low** = rubber-stamp unless you disagree. **Owner-driven** = you asked for the
  feature; only the implementation is up for review. Superseded rows are marked
  ~~struck~~ or *superseded*.
- **§4** is **unlogged assumptions (U-numbers)**: true in the code, content or
  infrastructure but never written down as a decision. Status column says what changed.
- **§5** is **architecture done by default (T-numbers)** rather than chosen.
- **§6** is **future work (F-numbers)** with options and a tentative recommendation.
- **§7** is the suggested agenda, in order: start there if time is short.

Reversibility: **easy** = a config line or a small PR; **moderate** = a feature-sized
PR or a content sweep; **hard** = touches URLs, the schema, all content, or user data.

Current facts used throughout (checked on `main` at `b5c0f5b`):

| Fact | Value (first version) | Source |
| --- | --- | --- |
| Terms (by folder) | **419**: security 177, cs 68, ai 134, platform 40 (255) | `app/src/content/terms/*` |
| Reviewed by a human | **0 of 419** terms, 0 of 180 questions, 0 of 40 articles (0 of 255) | `grep draft: false` |
| Technical deep dives | **419 of 419**, EN + DA, ~200-450 words each (none) | `grep ^deepDive:` |
| Articles | 20 terms × 2 languages = 40 files (40) | `app/src/content/articles/` |
| Hand-written questions | **180**, all `draft: true` (none) | `app/src/content/questions/` |
| Terms with an `era` | 202 of 419; 217 undated (106 of 255) | `grep ^era:` |
| Terms with no source URL at all | **188** (125) | `grep -L url:` |
| Terms citing the unpublished course compendium | 95 | `grep -l Ordliste` |
| Lint | 0 errors, 91 warnings: **55 Danish E1 advisory**, 31 W3, 2 W2, 1 W4, 2 W6 (151, all DA E1) | `npx tsx scripts/lint.ts` |
| Clusters under ten | **none** (28 clusters) (9 clusters) | lint coverage line |
| Name collisions | only `audit` (`cs/audit`, `security/audit`) | lint collision report |
| `allowed-words` | EN 27, DA 24 entries (15 / 9) | `app/content/allowed-words.*.txt` |
| Backend | Supabase (EU, Frankfurt per privacy page) + Cloudflare Workers AI; accounts and search by meaning **live** (dormant) | `privacy.ts`, owner log |
| Tests | 391 unit tests + build (75) | PR #56 |

---

## 2. Owner-approved baseline

### 2.1 ADRs and the unified vision

| ID | Decision (one line) | Drift in the build |
| --- | --- | --- |
| ADR-0001 | Depth derived from the `requires` DAG; no authored abstraction level; `layer` survives as a facet. | None. |
| ADR-0002 | Three-part granularity test (searched alone · standalone summary · own edge). | W2 now built (A57): 2 warnings. Later batches still added terms by "writers needed them" or "fill clusters to ten" (A12, A30, P2, P13) rather than the oracle. |
| ADR-0003 | Domain is a tag array; collisions become namespaced Terms; bare name serves a Disambiguation page. | Disambiguation page built (A56); only `audit` collides (A10). |
| ADR-0004 | Closed Vocabulary binds Summary + Body; Articles exempt. | Deep dives (A80, P10) and questions (A90) are also exempt, so most new prose is outside the lint. |
| ADR-0005 | Dictionary-primary; relationships are the leverage point (D1). | Build went far past "dictionary first" before any entry was reviewed (U13). |
| ADR-0006 | Curated closed set of 12 edge types, rich edges, no `related_to`, derived visual weight. | None. |
| ADR-0007 | Fully bilingual EN + DA; English ids canonical. | None. |
| ADR-0008 | Static-first on Astro; no database, no server in v1. | **Superseded in part** by A44 (accounts) and A75 (search backend). Content and pages stay static. |
| ADR-0009 | Closed Vocabulary in both languages; English blocking, Danish advisory, **reassess after the pilot**. | Reassessment still **not done**; Danish advisories fell 151 → 55 after the refinement pass (P14). |
| D1-D2, D5, D12-D13 | Dictionary-primary; closed edge set; bilingual; 12 edge types; coarse strength. | None. |
| D3 | Launch CS + Security; anchor to a real first user. | AI approved by you later (full AI dictionary, §2.2). **Platform (40 terms) was never approved** (P1). |
| D4 | First user = Cyber Security Fast Track student; the ordliste is the granularity oracle. | Compendium fully covered (P12); oracle bypassed for other batches. |
| D6 | CS cluster = networking + OS + identity. | Cryptography (A13) and web (P2) added. |
| D7 | Closed Vocabulary; curate → LLM draft → **human edit** → lint. | The **human edit** step has not happened for anything. |
| D8 | Four-facet bilingual Body; revisable. | Facet optionality never revisited; a fifth prose layer (deep dive) was added (A80). |
| D9 | Static-first; DB deferred until needed. | See ADR-0008. |
| D10 | Framework: Astro ("adopted to try; reversible"). | Astro 7 (A2). |
| D11 | Source tiers; ≥1 source per term. | Met formally; 188 terms have no URL; 95 cite the compendium, which has no URL (U14). |

### 2.2 Your decisions since the first version (from your feedback log)

Approved. Listed so the §3 rows that implement them are read as "how", not "whether".

| Your decision | Implemented by | Notes |
| --- | --- | --- |
| Name: **Atlas**. | A1 | Closes A1. |
| Hosting on **GitHub Pages** (free); no domain yet (no final name). | A17 | Shared-origin risk (U20) remains; see §7 item 4. |
| **Semantic search is vital**; heavy compute on the **backend**, never in the visitor's browser. | A75-A78 | Supersedes A51-A55. Vendor choice (Cloudflare) was the agent's. |
| Loosen the semantic-search deadline (cold starts). | A77 (PR #30) | 5.5 s server / 6 s browser. |
| **Accounts + synced progress** wanted. | A44-A49 | Now live. |
| **Hide email sign-in** until mail is sorted; add **LinkedIn sign-in**. | A87 | LinkedIn configured and live. |
| **Privacy page**, controller Christoffer Maintz Andersen. | A88 | Legal content was AI-written (see A88). |
| Staying signed in via browser storage; no cookie banner while only strictly-necessary storage is used. | A88 | Revisit if analytics are added. |
| **Security practices must be correct** (no leaked secrets; audit + hardening). | A89 | Owner steps still open (§4 U42). |
| No backwards-compat or migration work before launch. | A50, A90 | |
| Mark the site **BETA** (corner ribbon). | PR #33 | |
| Include **all** compendium security terms with relationships; NIS1, CSRF, Cloud IAM as separate terms. | P12, P13 | |
| A **full AI dictionary** (aicodingdictionary.com breadth). | P11 (PR #21) | Resolves the AI half of old agenda item 1. |
| Refinement pass on all text; access control before OAuth. | P14, A79 | |
| **Deep dive** ("Read more") for every term, with sources. | A80, P10 | Content written by agents (P10). |
| No quiz question on a term's page whose answer is the term; domain/overall quizzes; sync automatic with status. | A79 | |
| A hand-written bank of researched (scenario) questions. | A90 | |
| Guided tour; fix the jank, don't redesign it. | A61, A85 | |
| Timeline: swim lanes, fit on screen, stronger decade lines. | A81, A82, PR #46 | Scrollytelling is an idea only (F22). |
| Compare page split by domain. | PR #46 | |
| Term panel: click → side panel, Expand in place, Read more to the term page; Previous/Next. | A80, A83 | You also asked to drop the panel's EN/DA toggle (open). |
| About dialog ("i" on the map, credits, photos). | A84 | Your About role is still "revisit". |
| Explorer: domain colours; arrows + animated one-way links; islands per cluster; **stable map** (computed once, no re-render on toggles); no dragging; selection dims the rest; minimum spacing; **no seams** for shared terms; strong links shown by default. | A74, A86 | |
| Explorer: **floating, centred control bar** with full parity; legend top-left; bar must not move when the panel opens; "Colour by" inline; relationship toggles affect only the overview. | A93, A93a | A93a is PR #57 (open). |
| A hidden canvas lab to compare renderers. | A91 | Renderer choice still open (T12). |
| **Light theme** covering everything, cream map background. | A92 + `feat/light-theme-complete` | A92's "night map" part is overridden. |
| **No em-dashes** anywhere user-facing, with a lint rule. | A94 | Four Explorer files still to sweep. |
| **Only the owner merges PRs** (from 2026-09-25); keep PRs reasonably sized; only merge Dependabot PRs with a green check. | process | Closes P8. |
| AI tutor deferred. | F1 | |

---

## 3. Autonomous decisions

Columns: **What** was decided · **Alternatives** realistically available ·
**Cost / consequence** · **Rev.** (reversibility) · **Discuss?** (flag + why).

### 3.1 Stack & hosting

| # | What | Alternatives | Cost / consequence | Rev. | Discuss? |
| --- | --- | --- | --- | --- | --- |
| A1 | Working name "Atlas" (repo `tech-atlas`). | Lexicon, Leksikon, Ordkort, Meridian. | `app/package.json` is still named `lexicon`. | easy now | **Owner-approved** (§2.2). |
| A2 | Upgraded Astro 5 → 7.3.4 to clear a critical + high advisory. | Stay on 5 with an audit exception. | Newest major; ecosystem lags (A21). | moderate | **Low**. |
| ~~A3~~ | ~~MIT covers everything~~ - *content part superseded by A66*; code stays MIT. | - | - | - | see A66. |
| A4 | Gitignore raw inputs (compendium PDF, docx, `_ingest/`, demos). | Private submodule / repo. | Source material not versioned anywhere shared. | easy | **Low** - confirm the originals are backed up. |
| A5 | App in `app/`, specs in `design/`. | Monorepo with packages. | One npm package (T4). | moderate | **Low**. |
| A16 | Manual `[lang]` routing; `/` meta-refreshes to `/en/`; `hreflang`. *Extended by A63 (Danish suggestion banner).* | Danish default; detect language on `/`. | **The Danish first user still lands in English.** | easy | **High** - you are recorded as "undecided" (A63). |
| A17 | GitHub Pages at `https://cmaintz.github.io/tech-atlas/`, deploy from `main` (gated since A65). | Cloudflare Pages / Netlify; custom domain. | No response headers; **shared origin** (U20); URLs tied to your username. | moderate | **Owner-approved** (§2.2); the shared origin is a separate question (§7 item 4). |
| A21 | Leave Astro's editor-schema warning; `schema.ts` stays on standalone zod 3. | `astro/zod` (zod 4). | Two zod versions; Dependabot now ignores zod majors (P15). | easy-moderate | **Low**. |

### 3.2 Content model & authoring

| # | What | Alternatives | Cost / consequence | Rev. | Discuss? |
| --- | --- | --- | --- | --- | --- |
| A14 | Closed Vocabulary base = FrequencyWords top-30k per language (CC BY-SA 4.0, subtitle corpus) + inflection stripping + Danish compound splitting. | 10k list; curated plain-language list; DSL lists. | 30k is permissive; odd gaps (the lists grew to EN 27 / DA 24). | moderate | **High** - this list *is* "plain language". |
| A15 | All content `draft: true`. | Review in batches before adding more. | 419/419 terms, 180 questions, 40 articles unreviewed; draft banner everywhere. | easy per item | **High** - see F2. |
| ~~A18~~ | ~~E5 deferred~~ - *superseded by A58 (built)*. | | | | - |
| A19 | Symmetric edges on the alphabetically-first id. | Either side + dedupe. | Deterministic. | easy | **Low**. |
| A32 | `content/manifest.yaml` regenerated from the term files. | Drop it. | Duplicates the files. | easy | **Low** - consider deleting (T3). |
| A40 | Review queue `/[lang]/review/` with "Edit on GitHub" links. | Local review CLI; PR-per-batch; CMS. | Approving = hand-editing YAML, now for ~1,000 items (terms, deep dives, questions, articles). | easy | **High** - F2. |
| A66 | **Content licence = CC BY-SA 4.0** (terms, articles, questions, wordlists, data files); code stays MIT. | CC BY 4.0; all rights reserved for content; ask the course owner first. | ShareAlike matches the wordlists; hard to tighten once published. **Compendium-seeded Danish wording** (95 terms cite it) may need the course owner's permission - not settled. | hard once published | **High** - chosen alone; a licence is yours to grant. |
| A70 | Doc refresh: `design/schema.ts` re-exports the app schema; SPEC contradictions fixed; P1-P9 recorded. | - | Good. | easy | **Low**. |

### 3.3 Derived data, graph & Explorer

| # | What | Alternatives | Cost / consequence | Rev. | Discuss? |
| --- | --- | --- | --- | --- | --- |
| A7 | Cytoscape.js for 2D; 3d-force-graph for 3D. | Sigma.js; D3; a hand-rolled canvas (now A91). | Two graph libraries + three.js; the canvas lab is a third renderer (T12). | moderate | **Low** here; renderer choice is T12. |
| A25 | Explorer modes, filters, route finder (edges treated as two-way), `?focus=`. | Directed routes only. | Route finder treats `contrasts-with` like `requires`. | moderate | **Med** - are undirected routes meaningful to a learner? |
| A26 | Term pages: sidebar graph + "What to learn first" (all transitive prerequisites). | Direct prerequisites only. | Depends on unreviewed `requires`. | easy | **Low**. |
| A27 | One graph model shared by build and site; `/graph.json` static. | - | Whole graph shipped to the client (T5). | easy | **Low**. |
| A29 | Seven edge *families* drive colour and filters. | Colour by raw type. | Exact type only in labels. | easy | **Low**. |
| A33 | Explorer progressive: focal term + "Expand +1" + "Whole map". | Always whole map. | Now actions in the term panel (A93). | easy | **Low**. |
| A38 | Auto-linking of first mentions; Mentions derived. | Explicit links. | Heuristic can mislink (B4.5). | easy | **Low**. |
| A42 | `era` flows through the derived graph. | - | - | easy | **Low**. |
| B4.5 | Auto-linking stop-list + domain-aware collision resolution. | Per-term "don't link" flags. | Hand-maintained. | easy | **Low**. |
| A74 | Graph visual language in `graph-style.ts`: domain hues (security 355°, cs 212°, ai 285°, platform 150°), cluster shades, direction from the schema's `symmetric` flag, curves, island layout. *Layout, flow and 3D superseded by A86; colours and direction stand.* | Colour by cluster only. | Owner-driven feature; hue values and island packing were the agent's. | easy | **Low** - **Owner-driven**. |
| A86 | **Explorer v2**: one stable map per page, layouts computed once; domain filter hides in place; overview = "backbone" (every `requires`/primary edge + each term's 2 strongest same-domain edges; 954 of 1734 edges); cluster ribbons; node size = PageRank; minimum spacing; 3D "galaxies" with fixed positions; flow dots on every one-way edge; selection dims the rest. *Seams removed and sidebar replaced (A93) on your request.* | Keep per-render layout; WebGL renderer (tried, no faster). | Owner-driven. Agent choices: the backbone rule (the overview's density lever), PageRank sizing, 3D galaxy layout, first-load cost ~520 ms. Performance measured headless on an RTX 3080 with 2× CPU throttle, not on a phone (U47). | moderate | **Med** - **Owner-driven**; is the backbone the right default overview? |
| A91 | **Hidden canvas lab** at `/<lang>/lab/5f69d757b126/`: one hand-rolled canvas, "fake 3D", split-band nodes, elastic snap-back; `noindex`, linked from nowhere. | A branch preview; a separate repo. | **Obscure, not secret** (public repo). 1,057 lines of a second renderer to maintain until you decide. | easy (delete the page) | **Med** - **Owner-driven**; decide renderer (T12). |
| A93 | **Floating control bar** replaces the sidebar: 2D/3D, layouts, auto-rotate (3D, new), domain pills, popovers (Relationships, Colour by, Route), Find a term; legend in its own box; term-panel action row; **hover card after 1.2 s** (mouse only). | Keep the sidebar. | Owner-driven. Agent choices: 1.2 s dwell, auto-rotate off by default, phone "Controls" sheet. | easy | **Low** - **Owner-driven**. |
| A93a | *(PR #57, open)* Legend top-left as a pill; bar centred with fixed insets and **never moves** when the panel opens; "Colour by" inline; **relationship toggles filter the overview only**; `used with` off by default; one-row bar with dot-only domain chips; one "Read more". | - | Owner-driven. Known gap: at 1280 px the docked panel hides the bar's right end. Dot-only chips hide domain names behind a tooltip. | easy | **Low** - **Owner-driven**; check the 1280 px gap and dot-only chips. |

### 3.4 UI / UX, pages and the term panel

| # | What | Alternatives | Cost / consequence | Rev. | Discuss? |
| --- | --- | --- | --- | --- | --- |
| A22 | *(Status note, superseded.)* | - | - | - | - |
| ~~A28~~ | ~~Era view deferred~~ - *superseded by A41, then A81*. | | | | - |
| ~~A41~~ | ~~Timeline by decade~~ - *superseded by A81*; the Explorer's Time layout (now in A86) stands. | | | | - |
| ~~A43~~ | ~~CSS-only timeline filter~~ - *superseded by A81* (the timeline is now a small island). | | | | - |
| A61 | Guided tour = hand-rolled Preact island; resumes across pages; welcome card on first visit (any page); `?tour=N` fallback without storage. *Motion and placement superseded by A85.* | driver.js / shepherd (don't resume across page loads). | Owner-driven. ~580 lines of our own code. Auto-shows on first visit anywhere. | easy | **Low** - **Owner-driven**. |
| A62 | Home page = hero + search + domain cards + random term + Recently viewed + the full A-Z index; breadcrumbs on term pages. | Separate landing and index. | - | easy | **Low**. |
| A63 | `/` still → `/en/`; English pages show a Danish suggestion banner when the browser prefers Danish. | Redirect Danish browsers. | Workaround pending A16. | easy | see A16. |
| A64 | UX baseline: mobile nav, "/" shortcut, skip link, focus ring, back-to-top, copy-link, bilingual 404, canonical + OG meta, print styles, reduced motion. *"No light theme" superseded by A92.* | - | No `og:image` (no raster art). | easy | **Low**. |
| A72 | "Just works" URLs: A-Z index; a redirect page for every unambiguous short name (`/en/terms/mfa/`); names shared by two terms go to search. | Server redirects (not on Pages). | ~2,500 small redirect stubs in `dist/` (noindex). | easy | **Low**. |
| A73 | "Sources · Continue learning" grouped by tier; print extends A64. Share button left out. | A resources schema field. | - | easy | **Low**. |
| A80 | **Term panel** in the Explorer (docked right, Expand in place, `?term=` deep link, facets as tabs, EN/DA text toggle); new schema field **`deepDive: {en, da}`**, exempt from Closed Vocabulary; sources become "Sources & further reading" with a "Where this data comes from" note. | Navigate to the term page. | Owner-driven. **You asked to drop the panel's EN/DA toggle** (open). Deep dives add a fifth, unlinted prose layer (see P10). | easy (toggle); moderate (field) | **Low** - **Owner-driven**; confirm the toggle removal. |
| A81 | **Timeline v2**: one swim lane per domain, density-weighted year axis, era bands, milestones (top 12 % by degree), click opens the term panel; fits the screen at zoom 0; "+N" chips for overflow. | - | Owner-driven. You later found it denser than before. | easy | **Low** - **Owner-driven**. |
| A83 | Term panel Previous/Next through the anchor term's connections; Back/Forward through viewed terms; keyboard ←/→ and Alt+←/→. | Previous = last viewed only. | Owner-driven; both meanings offered. | easy | **Low** - **Owner-driven**. |
| A84 | **About dialog** (Explorer "i" + footer link), credits and photos (initials if no photo at build time). | - | Owner-driven. Your role wording is still "revisit". Personal photos and LinkedIn in a public repo (owner-supplied). | easy | **Low** - **Owner-driven**. |
| A85 | Tour motion rework: scroll first, then glide (420 ms); `placeCard` never covers the target; a "bridge" card points at the link before a page change; 13 steps. View Transitions tried and dropped. | Redesign after the demo (you said no). | Owner-driven. | easy | **Low** - **Owner-driven**. |
| A92 | **Light theme** via semantic colour tokens; System / Light / Dark menu (`atlas.theme`); no-flash script as the first child of `<body>` (CSP forces it out of `<head>`); language menu with SVG flags; footer at the bottom; signed-out account page = sign-in page. **"Night map"** (maps stay dark in light theme) - *being overridden by your "light theme everywhere" (branch `feat/light-theme-complete`).* | CSS remap of the neutral palette. | Owner-driven. Tokens meet WCAG AA (worst 4.74:1). | moderate | **Low** - **Owner-driven**. |

### 3.5 Learning

| # | What | Alternatives | Cost / consequence | Rev. | Discuss? |
| --- | --- | --- | --- | --- | --- |
| A24 | Learner progress local-first in `localStorage` (*extended by A44*). | Accounts from day one. | Shared origin (U20). | easy | **Low**. |
| A34 | Quizzes generated from edges; distractors from same cluster/domain. *Refined by A79.* | Hand-authored only. | Quiz quality = edge quality (unreviewed). | easy | **Med** - try a session. You also flagged "odd one out" as possibly unfair and "often used together" questions as droppable (your 💬). |
| A35 | Spaced repetition = Leitner boxes (0/1/3/7/16/35 days). | SM-2 / FSRS. | Simple. | easy | **Low**. |
| A36 | Knowledge map: Know / Familiar / Learning / Don't understand; 3 right in a row = known. | Two-state. | Self-rating and quiz can disagree. | easy | **Low**. |
| A50 | No migration from `atlas:learner:v1`. | Migration. | Matches your "no migrations before launch". **Once real users exist, the next format change needs one.** | easy | **Owner-approved**. |
| A79 | Questions split into *about X* (answer is another term) and *answered by X* (shown only on neighbours' pages); true/false is false only by reversing an edge; "Quiz me on" everything / domain / cluster / weak terms; no "Sync now" (auto-retry 5 s/15 s/60 s/5 min); **ten `requires` edges added** (e.g. OAuth → access control). | - | Owner-driven. The ten edges are content the agent chose. | easy | **Low** - **Owner-driven**. |
| A90 | **Hand-written question bank**: `questions` collection per cluster; 5 kinds; lint Q1-Q9, W9-W10; per-question Leitner record; **180 draft questions written by parallel research agents** (~69 % scenarios in Danish workplaces); web-search quota ran out mid-way, so agents fetched known URLs and **cited lower-tier sources where primaries were unreachable** (ISO 27002 via ISMS.online, ALE via Wikipedia, GDPR via gdpr-info.eu, AI Act via artificialintelligenceact.eu). | Fewer, owner-written questions. | Owner-driven feature. Content risk: 180 unverified items; 4 distractors changed substance in a length pass (`ctl-control-type-mapping`, `comp-iso-27001-vs-27002`, `risk-monitoring-vpn-warning`, `cd-committed-key-rotate`). | easy | **High** - part of the review workflow (F2); lower-tier citations need checking. |

### 3.6 Search (lexical, intents, semantic)

| # | What | Alternatives | Cost / consequence | Rev. | Discuss? |
| --- | --- | --- | --- | --- | --- |
| A39 | Search intents: "X vs Y", "from X to Y", "before X" (EN/DA). | Explicit buttons. | Regex parser. | easy | **Low**. |
| B4.6 | Danish "mod" is a compare separator only after "sammenlign". | - | - | easy | **Low**. |
| ~~A51~~ | ~~Static in-browser semantic search (e5-small, ~135 MB download)~~ - *superseded by A75-A78* (you rejected the download). | | | | - |
| ~~A52~~ | ~~Vectors committed for the browser~~ - *superseded by A76*. | | | | - |
| ~~A53~~ | ~~Opt-in model download~~ - *superseded by A78*. | | | | - |
| A54 | Hybrid ranking = reciprocal rank fusion (k = 60) of semantic hits and names/aliases search; "by meaning" label. *Carried into A78; margin re-tuned to 0.06 (A76).* | Weighted blend. | Magic numbers tuned on 16 fixtures. | easy | **Low**. |
| ~~A55~~ | ~~Self-hosted ONNX runtime (dev prerelease)~~ - *superseded by A75* (no runtime in the browser). | | | | - |
| A75 | **Search by meaning on the backend**: vectors in Supabase Postgres (pgvector, 1024-dim), a `semantic-search` Edge Function; the model is **bge-m3 on Cloudflare Workers AI** (a model inside the Edge Function measured too heavy: +360 MB, 1.8-3 s CPU against a 256 MB / 2 s limit; Supabase's built-in model is English-only). | Hosted embedding API (OpenAI, Cohere, Voyage); a small VM; Supabase-only with an English model. | Owner-driven feature. **Agent choices: Cloudflare as a second vendor** (another account, token, and US processor of query text), bge-m3. | moderate | **High** - the vendor is yours to approve (U39). |
| A76 | Stored and query vectors come from one service by construction: CI re-embeds every term through the same Workers AI call; committed `supabase/seed/term-vectors.json` (~1.2 MB) only for the lint and offline tests; smoke test of 3 queries after each backend deploy. | Seed from the committed file. | **Contributors still run `npm run embed` when term text changes** (downloads bge-m3 locally, ~GB). | moderate | **Med**. |
| A77 | Function contract + abuse limits: `q` ≤ 200 chars, 2 KB body cap, **30 requests/min per client, 50,000/day total**, client = SHA-256 of IP; one 5.5 s deadline (owner-loosened); CORS for `cmaintz.github.io` + localhost; `--no-verify-jwt`; **relies on Supabase's legacy anon + service_role keys staying enabled**. | JWT-gated; an edge WAF. | The binding budget is **500,000 Edge Function invocations/month** (free plan); rejected requests still count. Legacy keys may be retired by Supabase (U40). | easy | **Med** - accept the limits and the legacy-key dependency? |
| A78 | Client: on only when `PUBLIC_SEMANTIC_SEARCH_URL` is set; 300 ms debounce, 2 s → 6 s timeout, **silent fallback** to name search; `backend.yml` deploys migrations, secrets, function, seed and smoke test after a green gate on `main`. | Show an error. | Migrations run on `main` with no staging project (T13). | easy | **Low**. |

### 3.7 Accounts, privacy & security

| # | What | Alternatives | Cost / consequence | Rev. | Discuss? |
| --- | --- | --- | --- | --- | --- |
| A44 | Optional accounts + synced progress via Supabase free tier, called from the browser; on only when the `PUBLIC_SUPABASE_*` variables are set. **Supersedes part of ADR-0008.** | Export/import a file; Firebase; PocketBase; Cloudflare D1. | Owner wants accounts (§2.2). **Now live.** Personal data, GDPR duties, free-tier pause, shared origin (U20). | moderate | **Med** - feature approved; vendor (Supabase) was the agent's. |
| A45 | Learner state v2, one jsonb row per user, commutative merge. *Extended by A90 (per-question records).* | Per-term rows; CRDT. | Whole-document writes. | moderate | **Low**. |
| A46 | Auth = email magic link + GitHub OAuth, PKCE. *Amended by A87.* | Passkeys; Google. | Email needs custom SMTP and a sending domain. | easy | see A87. |
| A47 | "Delete my synced data" = tombstone + revoke sessions; **auth identity deleted by hand** (steps in `docs/SUPABASE_SETUP.md`). | Edge Function that deletes the auth user. | GDPR erasure is manual, answered by email within a month. | moderate | **Med** - fine for a few users; automate before a cohort? |
| A48 | Monotonic per-term timestamps; far-future clamped. | Server clock. | - | easy | **Low**. |
| A49 | Optimistic concurrency via server-bumped `version`. | Last-write-wins. | - | easy | **Low**. |
| A87 | Email sign-in hidden (`EMAIL_SIGNIN = false`); providers from `PUBLIC_AUTH_PROVIDERS` (`github`, `linkedin_oidc`). | - | Owner-driven. LinkedIn OIDC needs a LinkedIn Company Page. | easy | **Low** - **Owner-driven**. |
| A88 | **Privacy page** (controller, every processing activity with Art. 6 basis and retention, sub-processors, every storage key; a test fails on an unlisted key); rate-limit hash deleted within ~12 min via **pg_cron**; "Download my progress". | A lawyer-written notice; a template service. | Owner-driven feature. **The legal content (bases, retention, "Supabase Frankfurt, EU", "Cloudflare may process outside the EU") was written by an AI.** Verify the project region is really Frankfurt. | easy | **High** - read it once as the controller. |
| A89 | **Security hardening**: gitleaks over full history in the gate; `dist-guard` refuses to ship a secret or an uncovered page; **meta CSP** (`script-src 'self'` + hashes; **`style-src 'unsafe-inline'`** because Cytoscape/3d-force-graph inject styles; no `frame-ancestors` possible, so a frame guard hides the page); step-scoped CI secrets; Dependabot 5-day cooldown. | Headers via a proxy host (Cloudflare Pages); nonce-based CSP. | Owner-driven. **11 owner steps in `docs/SECURITY.md` are still open** (branch ruleset, `backend` environment, private vuln reporting, SHA-pin enforcement, auth rate limits, token scoping/rotation). | easy | **Med** - **Owner-driven**; do the owner steps (U42). |

### 3.8 CI / tooling

| # | What | Alternatives | Cost / consequence | Rev. | Discuss? |
| --- | --- | --- | --- | --- | --- |
| A6 | `audit` = `npm audit --audit-level=high` (*test part superseded by A23/A37; extended by A89: gitleaks + registry signatures*). | `--audit-level=moderate`; OSV. | High/critical only. | easy | **Low**. |
| A23 | `mise run test` runs the production build as a smoke test. | Separate job. | Slower gate. | easy | **Low**. |
| A37 | Vitest unit tests for pure modules (now 391). | + Playwright e2e, + axe. | **No browser tests**; every UI PR is still verified by hand in headless Edge (P7). | easy | **Med** - F6. |
| A56 | Disambiguation page at `/[lang]/terms/<name>/` for shared bare ids (only `audit`). | - | Implements ADR-0003. | easy | **Low**. |
| A57 | Lint W2 "redundant child", read literally. | - | Implements ADR-0002; 2 warnings. | easy | **Low**. |
| A58 | Lint E5 circular definition = loop with no term whose plain facet names no other term; first run fixed one loop in content. | - | Implements SPEC §5. | easy | **Low**. |
| A59 | Lint W3 "non-foundational" = nothing requires it and it requires nothing. | Depth-based test. | **31 W3 warnings, never addressed.** | easy | **Low**. |
| A60 | Build reports (draft ratio per domain, coverage, depth histogram, collisions) printed by the lint. | - | - | easy | **Low**. |
| A65 | **Deploy only what passed the gate** (`workflow_run` of `gate` on `main`, exact `head_sha`). | Reusable workflow. | Merging is still ungated until you add a branch ruleset (U28). | easy | **Low**. |
| A67 | **Dependabot** weekly, grouped; `onnxruntime-web` and `@huggingface/transformers` ignored. *Majors for TypeScript, zod, @types/node ignored after P15.* | Renovate. | The ORT ignore is now stale (ORT left the site in A75). | easy | **Low**. |
| A68 | SEO basics: sitemap (local integration), `x-default`, `DefinedTerm` JSON-LD, `robots.txt` (no effect without a root domain). **Drafts not `noindex`ed.** | `@astrojs/sitemap`; noindex drafts. | Unreviewed AI text is indexed. | easy | **Med** - `noindex` drafts? (U33) |
| A69 | Open data: `/api/terms.json`, per-term JSON, CSV, Anki text decks, `/[lang]/data/`. | Real `.apkg`. | Publishes unreviewed content under A66's licence. | easy | **Low**. |
| A71 | RSS feed of new terms, dated from git history. | Authored "added" field. | - | easy | **Low**. |
| A94 | **No em/en dashes** in user-facing text, swapped one-for-one; lint **E12** on content; a test on exported UI strings. | Per-sentence rewrite. | Owner-driven. Components and pages are not scanned; four Explorer files still to sweep. | easy | **Low** - **Owner-driven**. |
| P7 | *(PR-only)* Headless-Edge smoke tests run by hand as the browser verification (every UI PR since). | Playwright in CI. | Not repeatable. | easy | **Med** - F6. |
| ~~P8~~ | ~~AI review is the only code review; PRs merged under your account~~ - *resolved: only the owner merges (your decision, 2026-09-25)*. | | | | - |
| P15 | *(PR #29)* Dependabot majors (TypeScript 7, zod 4, @types/node 26) were merged and **broke `main`** (gate, deploy, backend); reverted, and those majors are now ignored. | Merge majors only with a green check (now your rule). | The project is pinned to TypeScript 5 and zod 3 until someone migrates by hand. | easy | **Med** - who owns major upgrades? |

### 3.9 Content editorial choices

| # | What | Alternatives | Cost / consequence | Rev. | Discuss? |
| --- | --- | --- | --- | --- | --- |
| A8 | IDS and IPS as two terms. | One term. | - | easy | **Low**. |
| A9 | ISO 27001 and 27002 as two terms. | One term. | - | easy | **Low**. |
| A10 | `backup`, `endpoint` shared `[security, cs]`; `audit` the only namespaced collision. | Namespace `policy`, `control`, `patch`, `port`. | ADR-0003 exercised by one pair. | moderate | **Med**. |
| A11 | `two-factor-authentication` own term, `kind-of mfa`. | Alias of MFA (your D4 note). | Contradicts D4. | easy | **Med**. |
| A12 | Batch 2: 20 terms beyond the ordliste. | Rephrase around them. | Oracle replaced by "writers needed them". | easy | **Med** (with A30, P2, P13). |
| A13 | Cryptography as a fourth CS cluster. | Fold in. | - | easy | **Low**. |
| A20 | Content fixes from AI review. | - | - | easy | **Low**. |
| A30 | Batch 3: 26 terms + 40 edges. | - | As A12. | easy | **Med**. |
| A31 | 12 security/CS articles, both languages, Danish written natively. | English only. | Unreviewed factual claims. | easy | **Med**. |
| A82 | **Era backfill**: 50 years added where "defensible" (year of common use; laws = adoption year); 217 terms stay undated; the timeline's order was correct (CS starts in the 1960s by the data). | Leave undated. | Owner-driven question; the 50 years are the agent's judgement. Applies the rule of B4.1 **and** P3 at once, so B4.1 vs P3 is now "one rule with a law exception". | easy | **Med** - accept the rule as applied? |
| B4.1 | `era` = the year a term entered common use (MFA = 2011). | Year of invention. | Contestable single years shown as fact; laws use adoption year (P3). | moderate | **Med** - see A82. |
| B4.2 | No `security` domain on ML/LLM terms. *PR #21 tagged six AI-risk terms `[ai, security]` anyway (jailbreak, slopsquatting, …).* | Tag them. | Rule and practice now differ slightly. | easy | **Low**. |
| B4.3 | `eu-ai-act`, `ai-governance` have no `layer`. | A governance layer. | - | easy | **Low**. |
| B4.4 | Proper nouns dropped from English prose to pass E1. | Exempt capitalised proper nouns. | Vaguer prose. | easy | **Med** - exempt proper nouns? |
| B4.7 | EU AI Act dates follow the Digital Omnibus (Reg. (EU) 2026/1744). | - | Legal dates written by an AI. | easy | **Med** - verify. |
| P1 | *(PR #7)* **AI (28) and platform (29) domains added.** | Stay on CS + security. | AI later approved by you (full AI dictionary). **Platform (now 40 terms) never approved.** | moderate | **High** - keep platform? |
| P2 | *(PR #11)* Batch 5: 48 terms, three new clusters. | - | - | easy | **Med**. |
| P3 | *(PR #11)* Regulations' `era` = adoption year. | Entry into application. | See A82. | easy | see A82. |
| P4 | *(PR #11)* `nis2-loven` its own term. | Alias. | Defensible. | easy | **Low**. |
| P5 | *(PR #11)* `cfcs` status `legacy` (tasks moved to SAMSIK in 2025). *Prose updated in PR #41.* | - | Factual claim to verify. | easy | **Low**. |
| P6 | *(PR #9)* Articles follow a fixed structure with fictional Danish personae. | Free structure. | Tone choice. | easy | **Low**. |
| P9 | *(PR #12)* Stale PR body. | - | History only. | - | **Low**. |
| P10 | *(PR #37)* **A technical deep dive for all 419 terms**, EN + DA, 3-6 paragraphs (~200-450 words), with article/clause numbers, written by agents; per the build log, **partly without web access**; sources appended "where the text relies on them". Exempt from Closed Vocabulary; not embedded for search. | Deep dives for a few key terms; owner-written. | Owner-driven feature ("Read more" with sources). **The largest body of unverified factual claims in the product** (~838 texts). PR #41 already found errors (NIST SP 800-61 revision, risk-tolerance alias, hypervisor edge). | moderate | **High** - review priority (F2). |
| P11 | *(PR #21)* The AI dictionary: **104 terms, 8 new clusters** (training, evaluation, model-architecture, prompting, ai-infrastructure, retrieval, agents, ai-coding). | Fewer, deeper clusters. | Owner-driven breadth; the cluster shape was the agent's. AI (134) now rivals security (177). | moderate | **Low** - **Owner-driven**. |
| P12 | *(PR #16)* Compendium coverage: 144 concepts mapped (`design/COMPENDIUM_COVERAGE.md`); **34 new terms, 4 aliases, 9 deliberately left out** (vendor platforms, teaching methods, D-mærket criteria areas). | Include the 9. | Owner-driven. | easy | **Low** - glance at the 9 exclusions. |
| P13 | *(PR #15)* Batch 6: your three terms (NIS1, CSRF, Cloud IAM) **plus 22 unrequested terms to lift every cluster to ten**. | Merge small clusters; drop the rule. | Satisfies SPEC §11's "no cluster under ten" by adding content rather than restructuring. | easy | **Med** - is "ten per cluster" worth more terms? |
| P14 | *(PR #22)* Refinement pass (owner-requested): Danish workplace scenarios in every `inPractice`, facet de-duplication, accuracy fixes (D-mærket's 8 criteria, Datatilsynet, ePrivacy vs GDPR, NIS2 Art. 23), British spelling; allowed-words DA grew by 11. | - | Owner-driven. Danish term-name inconsistency noted but not fixed (Autentificering / Multifaktorgodkendelse / To-faktorautentificering). | easy | **Low** - **Owner-driven**. |
| P16 | *(PR #41)* Fixes after deep-dive review: `risk-tolerance` removed as an alias of `risk-appetite`; DA name `Risikoanalyse` → **`Risikovurdering`**; contingency-plan loses "incident response plan" aliases; `hypervisor` no longer requires `operating-system`; NIST SP 800-61 Rev. 3. | - | Renames a Danish course term. | easy | **Med** - is "Risikovurdering" the name your course uses? |

---

## 4. Unlogged assumptions

True in the repo, never written down as a decision. **Q** = suggested question for you.
**Status** says what changed since the first version.

### 4.1 Frameworks, libraries & vendors

| # | Assumption | Status | Why it matters | Q |
| --- | --- | --- | --- | --- |
| U1 | **Preact** for islands. | Open. Now 18 components; Explorer 858 lines, canvas lab 1,057. | Rewriting later is bigger. | Happy with Preact? |
| U2 | Tailwind v4; system font stack. | **Light theme done (A92).** | - | - |
| U3 | MiniSearch for lexical search (`fuzzy 0.2`, boosts guessed). | Open. | Index shipped whole. | OK as is? |
| U4 | Zod 3 standalone beside Astro's zod. | Open; zod majors now ignored (P15). | Two validators. | Migrate with the next schema change? |
| U5 | **Prettier only, no ESLint.** | Open. | "Lint" checks format and content, not code. | Add ESLint with a baseline? |
| ~~U6~~ | ~~ORT prerelease in production~~ | **Resolved** by A75. | - | - |
| U7 | **Supabase** as the backend vendor. | Now live, holds identities, vectors and rate limits. | See A44. | - |
| U8 | TypeScript everywhere; no Python. | Open. | - | Keep single-language? |
| U9 | Node 22 via mise; `ubuntu-latest` unpinned. | Open. | Runner drifts. | Pin `ubuntu-24.04`? |
| ~~U10~~ | ~~No dependency automation~~ | **Resolved** by A67 (see P15). | - | - |
| U39 | **Cloudflare is a second vendor** (Workers AI): its own account, account ID + API token in CI and in the function; receives every natural-language search query; "may process outside the EU". | New (A75). | Two dashboards, two tokens to rotate, two free tiers that can change. | Accept Cloudflare, or look at a single-vendor option? |
| U40 | **Search depends on Supabase's legacy API keys** (anon + service_role injected into the function). | New (A77). | If Supabase retires legacy keys, search by meaning silently falls back to names. | Plan a move to the new publishable/secret keys? |
| U41 | **pg_cron** is enabled by a migration (purges rate-limit hashes every 10 min). | New (A88). | A privacy promise now depends on a database extension and a job nobody monitors. | Monitor it, or accept? |

### 4.2 Content & authoring

| # | Assumption | Status | Why it matters | Q |
| --- | --- | --- | --- | --- |
| U11 | YAML for terms; ADR wording fixed (A70). | Mostly resolved. | Whitespace-fragile. | Keep YAML? |
| U12 | Folder = namespace = URL segment. | Open; short-name redirects added (A72). | Moving a term changes its URL. | Declare URLs permanent? |
| U13 | **All content is AI-drafted and unreviewed**: 419 terms, 838 deep-dive texts, 40 articles, 180 questions. | Grown. | The "robust data" promise rests on a human pass that hasn't started. | F2. |
| U14 | **Sources chosen by AI, never verified**: 188 terms have no URL; 95 cite the unpublished compendium; one known 404 (`security/exploit`'s NIST URL); no link checker. | Worse in count. | Hallucinated citations are the classic AI failure mode. | Link checker in CI? |
| U15 | Danish advisory: **55 warnings** (was 151); DA list 24 entries. | Improved. | ADR-0009's trigger has long fired. | Flip to blocking now? |
| U16 | Licensing: code MIT, content CC BY-SA 4.0 (A66); **compendium-seeded Danish wording** not cleared with the course owner; the model bge-m3 is MIT. | Partly resolved. | See A66. | Ask the course owner? |
| U17 | Content quality bar implicit; no reviewer checklist. | Open. | Nothing to approve against. | Write one (F2). |
| U18 | Clusters are free strings. | Open (28 clusters). | A typo makes a new cluster. | Enum per domain? |
| ~~U19~~ | ~~Clusters under ten~~ | **Resolved** by P13. | - | - |
| U43 | **How the new content was researched**: question-bank agents hit the web-search quota and fell back to known URLs and lower-tier sources; deep dives were written partly without web access; unverifiable counts were left out (Annex A 93 controls, D-mærket criteria count - term says 8, compendium says 4 areas). | New. | Tells a reviewer where to look first. | Start review with legal/standards claims? |
| U44 | **Danish term names are inconsistent** across related terms (Autentificering / Multifaktorgodkendelse / To-faktorautentificering). | New (P14 note). | A glossary should be consistent. | Pick the Danish names for the identity cluster? |

### 4.3 Hosting, security & privacy

| # | Assumption | Status | Why it matters | Q |
| --- | --- | --- | --- | --- |
| U20 | **Shared origin** `cmaintz.github.io`: every Pages site of your account can read Atlas's `localStorage`, which now holds **live Supabase sessions** (GitHub/LinkedIn). | **More urgent**: accounts are live; you approved Pages and deferred the domain. | Any other Pages site you publish (or a compromised one) could act as a signed-in learner. | Consciously accept until a domain exists, or publish from a dedicated org (free, no domain needed)? |
| U21 | No custom domain; URLs, Supabase redirect list, OAuth apps, CORS all tied to `cmaintz.github.io/tech-atlas/`. | You deferred it (no final name). | Moving later breaks links and needs auth reconfiguration. | - |
| U22 | URL stability not promised. | Open. | Renames 404. | Declare ids permanent? |
| ~~U23~~ | ~~No CSP~~ | **Resolved** by A89 (meta CSP; `style-src 'unsafe-inline'`; no `frame-ancestors`/HSTS/reporting without headers). | - | - |
| U24 | No analytics or error reporting. | Open (your cookie-banner note). | You can't tell whether semantic search fails in the wild. | None, or cookieless analytics? |
| ~~U25~~ | ~~No privacy notice~~ | **Resolved** by A88 (AI-written; verify). | - | - |
| U26 | **No Supabase backup plan**; free tier pauses after 7 idle days. | Open, and now holds real users. | Progress could be lost; a paused project breaks sync and search by meaning (silently). | Weekly `pg_dump` via Action? |
| U27 | Abuse limits: search limited (A77); **auth email rate limits and captcha not configured** (email is hidden for now). | Partly resolved. | - | Before re-enabling email. |
| ~~U28~~ | ~~Deploy not gated~~ | **Resolved** by A65; merge protection is U42 step 1. | - | - |
| U42 | **Owner steps from `docs/SECURITY.md` not yet done**: branch ruleset (require PR + `gate`), `backend` environment restricted to `main` with secrets moved in, private vulnerability reporting, require SHA-pinned actions, Dependabot security updates, Supabase redirect allowlist check, auth rate limits, token scoping and rotation. | New. | Today any push to `main` deploys; four account-level secrets are repository-wide. | Do steps 1-5 (about 15 minutes)? |
| U45 | **Four build-time flags** decide what the site offers: `PUBLIC_SUPABASE_URL`/`_ANON_KEY`, `PUBLIC_SEMANTIC_SEARCH_URL`, `PUBLIC_AUTH_PROVIDERS`; `SUPABASE_PROJECT_REF` gates the backend workflow. | New. | Behaviour lives in repo variables, not in code review. | - |
| U46 | **Personal data in the public repo**: your and Christina's names, photos and LinkedIn URL (About); your email as controller. | New (owner-supplied). | Permanent in git history. | Fine? |

### 4.4 UX, accessibility, i18n, SEO, performance

| # | Assumption | Status | Why it matters | Q |
| --- | --- | --- | --- | --- |
| U29 | i18n by hand; UI strings in `site.ts`, `ui-extra.ts`, `privacy.ts`, component-local strings (lab). | Open. | A third language is schema-wide. | EN+DA permanent? |
| U30 | English default at `/`. | Open (A16/A63). | - | See A16. |
| U31 | **No accessibility target**; graphs are canvas-only; colour carries meaning. | Better: AA contrast tokens (A92), ARIA on bar/panel/menus. Still no WCAG target or text fallback for the maps. | EU audience; EAA. | Target WCAG 2.2 AA for reading surfaces? |
| U32 | Browser support undefined (`:has()`, WebGL, `dialog`). | Open. | - | "Last 2 versions + Safari 16"? |
| U33 | SEO: done (A68) except **drafts are indexed**. | Partly resolved. | Unreviewed AI text in search engines under your name. | `noindex` until reviewed? |
| U34 | No performance budget. | Open; Explorer first load ~520 ms main-thread block. | "On a phone, mid-lookup". | Set budgets? |
| U47 | **Performance is measured on a desktop GPU** (headless Edge, RTX 3080, 2× CPU throttle as a laptop proxy); no real phone or low-end laptop test. | New. | Your top Explorer complaint was lag. | Test on your own laptop/phone? |

### 4.5 Process & repo

| # | Assumption | Status | Why it matters | Q |
| --- | --- | --- | --- | --- |
| U35 | Test strategy = unit + build; browser checks by hand. | Open. | Islands are the riskiest code. | F6. |
| U36 | AI-written commits carry your identity. | Open. | Provenance. | `Co-authored-by` convention? |
| ~~U37~~ | ~~Stale docs~~ | **Resolved** by A70 (re-check after this review). | - | - |
| U38 | Archive material in the repo root (`techlexicon/`, `design/00-09`). | Open. | Agents may read the wrong ADRs. | Move to `design/archive/`? |
| U48 | **Parallel agent streams** edited overlapping files and deferred to each other (e.g. A94's Explorer files, A84's CSS bridge, A80's sidebar card). | New. | Leftovers accumulate (four files with dashes; A67's stale ORT ignore). | Periodic cleanup PR? |

---

## 5. Tech & architecture never properly decided

| # | Area | What exists (by default) | Risk | Options | Tentative rec. |
| --- | --- | --- | --- | --- | --- |
| T1 | State management | Module singletons + `CustomEvent` + `localStorage`; 18 components. | Implicit contracts. | keep; nanostores; signals. | nanostores if islands keep growing. |
| T2 | Component architecture | Explorer 858 lines (plus `explorer-2d/3d/flow` libs), TermPanel 665, Timeline 725, Tour 577, canvas lab 1,057. | Large islands, no browser tests. | keep; split into hooks + view. | Split when next touched. |
| T3 | Content pipeline | Two loaders + `manifest.yaml`; now also `load-questions.ts`. | Can disagree. | single loader; drop manifest. | Both. |
| T4 | Repo shape | One npm package holds site, content, scripts, and the Edge Function's tests. | Contributors install everything (incl. transformers for `embed`). | keep; workspaces. | Keep until non-developer contributors. |
| T5 | Derived data | `graph.json`, search index, per-term JSON, question banks shipped static. | Linear growth. | keep; shard. | Keep; revisit at ~1,500 terms. |
| T6 | Scaling past ~1,000 terms | Explorer already needs a "backbone" to be readable at 419. | Hairball; slower gate. | keep; WebGL; DB. | Measure at 600. |
| T7 | Search index growth | Names, aliases, summaries in both languages. | Size. | keep; Pagefind. | Evaluate at 600+. |
| T8 | Error handling & logging | Silent fallbacks (search, sync); function logs in Supabase. | Field failures invisible (U24). | keep; tiny error beacon. | Add with a privacy-page entry if wanted. |
| T9 | Config & feature flags | Build-time repo variables (U45); `EMAIL_SIGNIN` constant. | Fine. | - | Keep. |
| T10 | Schema evolution | Zod `.strict()`; no schema version. | All-files sweeps (deep dives were one). | keep + codemods; `schemaVersion`. | Keep. |
| T11 | Committed derived artefacts | `supabase/seed/term-vectors.json` committed; everything else rebuilt. | Contributors must re-embed. | Keep, or embed in CI with Cloudflare secrets on PRs (no: secrets on PRs). | Keep. |
| T12 | **Explorer renderer** | Two live: Cytoscape + 3d-force-graph (Explorer) and a hand-rolled canvas (lab, A91). You are undecided and asked not to edit the lab for now. | Two renderers to maintain; lab animation tied to redraws (your bug note). | (a) keep libraries; (b) move to the canvas renderer; (c) keep both. | Decide after comparing on your own machine (U47). |
| T13 | **Backend topology** | Supabase (Postgres, Auth, Edge Function, pg_cron) + Cloudflare Workers AI; migrations applied from `main` by CI; **no staging project**. | A bad migration hits production directly. | keep; a second free Supabase project for PR previews. | Keep while users are few; add staging before a cohort. |
| T14 | **Theming** | Semantic tokens for page chrome; map components themed separately (light map in flight). | Two colour systems (tokens vs `graph-style.ts`). | keep; map colours from tokens. | Revisit when the light map lands. |

---

## 6. Future work

| # | Item | Open questions | Options | Tentative rec. |
| --- | --- | --- | --- | --- |
| F1 | **AI tutor** (deferred by you) | Where does it run? Grounding? | (a) client LLM (no: you rejected in-browser models); (b) server function + RAG over terms; (c) deterministic "explain this path" from edges. | (c) first; (b) later on the existing backend (Cloudflare Workers AI already wired). |
| F2 | **Human review workflow** - now ~1,500 items: 419 terms, 838 deep-dive texts, 40 articles, 180 questions. | Who (you, teachers, SMEs)? Checklist? Order? Native Danish pass? | (a) edit YAML on GitHub (A40); (b) review PR per cluster with a checklist; (c) local review UI that flips `draft` and records `reviewedBy/At`. | (b) now, security clusters first, legal/standards claims first (U43); freeze new content until those are reviewed. |
| F3 | **Content growth** | Deepen or widen? | finish review; deepen; new domains. | No new terms until review catches up. Your research asks (the "Jev classifier", ML-fundamentals verification) are in flight. |
| F4 | **Custom domain** | Deferred by you until a final name. | `atlas.<domain>`; dedicated GitHub org (free). | A dedicated org fixes U20 without a name decision. |
| F5 | Hosting with headers | Needed for `frame-ancestors`, HSTS, redirects. | Pages + meta CSP (today); Cloudflare Pages. | Keep Pages (your decision); revisit with F4. |
| F6 | **E2E / browser tests** | Which flows? | Playwright smoke (term page, search, Explorer, study, timeline) + axe. | Do it; the headless scripts used by hand already exist outside the repo. |
| ~~F7~~ | ~~CSP~~ | Done (A89). | | |
| F8 | Analytics | Wanted at all? | none; cookieless (GoatCounter/Umami) with privacy-page entry. | Your call; none is fine. |
| F9 | More languages | - | keep EN+DA. | Keep. |
| F10 | PWA / offline | Offline lookup on a phone? | service worker. | Cheap; worth it after F2. |
| F11 | Mobile app | - | PWA. | PWA only. |
| F12 | **Accounts hardening** (accounts are live) | Email sign-in (your three options: GitHub/LinkedIn only; Brevo free with personal sender; domain + Resend/Brevo); erasure automation; backups (U26); token rotation (you deferred). | - | Decide email together with F4; add a weekly backup Action. |
| F13 | Editor / CMS | Who edits besides you? | GitHub web editor; Keystatic. | GitHub now. Note: text changes need `npm run embed`. |
| F14 | Community contributions | - | suggestion form → issue. | Later. |
| ~~F15~~ | ~~Open data~~ | Done (A69). | | |
| F16 | More quiz types | - | ordering, odd-one-out (you flagged fairness). | Review A34/A79 kinds first. |
| ~~F17~~ | ~~Lint promises~~ | Done (A56-A60). | | |
| ~~F18~~ | ~~Dependency upkeep~~ | Done (A67); majors are manual (P15). | | |
| F19 | **Link / source verification** | - | lychee weekly in CI. | Do it; one 404 is already known. |
| F20 | **Explorer renderer decision** (T12) | Canvas vs libraries; the lab's animation bug. | - | Compare on your machine first. |
| F21 | Explorer queue (your 💬 items) | Semantic "Find a term" in the Explorer; drag/orbit cursor feedback; 3D colour for shared terms; is "fit everything into view" needed; draggable legend (deferred). | - | Next Explorer PR after #57. |
| F22 | Scrollytelling timeline | Idea only (you may build it separately). | - | Don't build. |
| F23 | Leftovers | A94's four Explorer files; A67's stale ORT ignore; `lexicon` package name; `manifest.yaml`; `techlexicon/` archive. | - | One cleanup PR. |

---

## 7. Suggested agenda

Ordered by value of your input × cost of getting it wrong later. Items 1-10 fit one
sitting; 11-16 are quick yes/no.

1. **Review workflow for ~1,500 AI-drafted items, all public and indexed** (A15, A40,
   A90, P10, U13, U43, U33, F2) - who reviews, a checklist, order (legal/standards
   claims first), freeze new content until done, and `noindex` drafts meanwhile?
2. **Content licence** (A66, U16) - CC BY-SA 4.0 was chosen for you; confirm or change,
   and decide whether to ask the course owner about compendium-derived Danish wording.
3. **Backend vendors and upkeep** (A75, A77, U39-U41, U26, T13) - accept Cloudflare as a
   second vendor, the legacy-key dependency, pg_cron, no backups and no staging while
   real accounts exist?
4. **Shared-origin sessions** (U20, U21, F4) - live sessions sit in storage every
   `cmaintz.github.io` site can read. Accept until a domain exists, or move to a
   dedicated GitHub org now?
5. **Security owner steps** (A89, U42) - branch ruleset, `backend` environment, private
   vulnerability reporting, SHA-pin enforcement, Dependabot security updates: about
   15 minutes of settings.
6. **Privacy page as controller** (A88) - read the AI-written legal text once; confirm
   the Supabase region really is Frankfurt.
7. **Email sign-in** (A87, F12, U27) - your open question: providers only, Brevo with a
   personal sender, or a domain + mail provider.
8. **Platform domain** (P1) - 40 terms you never approved. Keep, freeze, or unpublish?
9. **Danish Closed Vocabulary** (ADR-0009, U15, A14, B4.4) - 55 advisories left: flip to
   blocking now? Exempt proper nouns in English?
10. **Default language** (A16, A63, U30) - should `/` go to Danish for the first user?
11. **Explorer renderer and look** (T12, A86, A91, F20, F21) - canvas vs libraries,
    tested on your own machine (U47); the queued Explorer items.
12. **Test strategy** (A37, P7, U35, F6) - Playwright + axe smoke tests in the gate.
13. **Dependency majors** (P15) - who migrates TypeScript 7 / zod 4 and when.
14. **Era rule as applied** (A82, B4.1, P3) - "year of common use; laws = adoption year";
    217 terms undated.
15. **Small content calls** - `Risikovurdering` rename (P16), Danish identity names
    (U44), "ten per cluster" (P13), 2FA as its own term (A11), namespacing (A10).
16. **Cleanup** (F23, U38, U48, A32) - one PR for leftovers.
