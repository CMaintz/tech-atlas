# Decisions & assumptions review

Prepared 2026-09-23 against `origin/main` at `1a2bdda` (255 terms, PRs #1–#12 merged).
Nothing in this document changes code or content. It is the agenda for one sit-down
review of everything the AI decided or assumed while building Atlas without you.

---

## 1. How to use this doc

- **§2** lists what you already approved (ADRs 0001–0009, D1–D13). It is not up for
  review unless you want to reopen something. Where the build has drifted from an
  approved decision, the drift is noted there.
- **§3** is every logged autonomous decision (A1–A55, the "Batch 4" bullets, renamed
  **B4.1–B4.7** here) plus decisions stated only in PR bodies (**P1–P9**). Each has a
  **Discuss?** flag: **High** = worth talking through, **Med** = a quick yes/no,
  **Low** = rubber-stamp unless you disagree. Superseded rows are marked ~~struck~~ or
  *superseded*.
- **§4** is **unlogged assumptions (U-numbers)**: things that are true in the code,
  content or infrastructure but were never written down as a decision.
- **§5** is **architecture done by default (T-numbers)** rather than chosen.
- **§6** is **future work (F-numbers)** with options and a tentative recommendation.
- **§7** is the suggested agenda, in order: start there if time is short.

Reversibility: **easy** = a config line or a small PR; **moderate** = a feature-sized
PR or a content sweep; **hard** = touches URLs, the schema, all content, or user data.

Current facts used throughout (checked on `main`):

| Fact | Value | Source |
| --- | --- | --- |
| Terms | 255 (security 138, cs 60, platform 29, ai 28) | `app/src/content/terms/*` |
| Reviewed by a human | **0 of 255** (`draft: false` appears nowhere) | `grep draft: false` |
| Articles | 20 terms × 2 languages = 40 files | `app/src/content/articles/` |
| Terms with an `era` | 106 | `grep ^era:` |
| Terms with no source URL at all | 125 | `grep -L url:` |
| Lint | 0 errors, 151 warnings, **all 151 are Danish E1 advisory** | `npx tsx scripts/lint.ts` |
| Clusters under ten terms | web 6, observability 6, containers 6, cryptography 7, ai-risk 8, delivery 8, security-operations 8, os 9, cloud 9 | lint coverage line |
| Name collisions | only `audit` (`cs/audit`, `security/audit`) | folder listing |
| `allowed-words` | EN 15 entries, DA 9 entries | `app/content/allowed-words.*.txt` |

---

## 2. Owner-approved baseline

Not for re-review unless you want to. **Drift** notes where the build no longer matches.

| ID | Decision (one line) | Drift in the build |
| --- | --- | --- |
| ADR-0001 | Depth derived from the `requires` DAG; no authored abstraction level; `layer` survives as a facet. | None. |
| ADR-0002 | Three-part granularity test (searched alone · standalone summary · own edge). | Lint W2 ("redundant child", the mechanical check this ADR promises) was **never built** (`app/scripts/lint.ts` has no W2). Batches 2/3/5 added ~95 terms on "writers kept writing around them" rather than the oracle (see A12). |
| ADR-0003 | Domain is a tag array; collisions become namespaced Terms; bare name serves a Disambiguation page. | **No Disambiguation page exists** (no route, no code). Only one collision (`audit`) was created (A10). ADR text says `content/cs/token.md`; files are YAML. |
| ADR-0004 | Closed Vocabulary binds Summary + Body; Articles exempt. | None. |
| ADR-0005 | Dictionary-primary; relationships are the leverage point (D1). | None in principle; build order went far past "dictionary first" before any entry was reviewed (see U13). |
| ADR-0006 | Curated closed set of 12 edge types, rich edges, no `related_to`, derived visual weight. | None. |
| ADR-0007 | Fully bilingual EN + DA; English ids canonical. | None. |
| ADR-0008 | Static-first on Astro; no database, no server in v1. | **Partly superseded by A44** (Supabase for accounts). A51 deliberately kept semantic search off the DB. |
| ADR-0009 | Closed Vocabulary in both languages; English blocking, Danish advisory, **reassess after the pilot**. | Reassessment **never happened**. Evidence is in: 151 Danish advisory warnings across the 255 terms. |
| D1 | Dictionary-primary, map-differentiator, learning-emergent. | — |
| D2 | Closed edge set + rich edges; Mentions instead of `related_to`. | — |
| D3 | Launch CS + Security; anchor to a real first user. | **Scope expanded without a logged decision:** AI (28) and platform (29) terms added in PR #7 (see P1). |
| D4 | First user = Cyber Security Fast Track student; the ordliste is the granularity oracle. | Oracle bypassed for later batches (A12, A30, P2). |
| D5 | Fully bilingual EN + DA. | — |
| D6 | CS cluster = networking + OS + identity. | Cryptography (A13) and web (P2) added as further CS clusters. |
| D7 | Closed Vocabulary, both languages; curate → LLM draft → **human edit** → lint pipeline. | The **human edit** step has not happened for any term. SPEC §5 still says Danish is build-blocking before v1, contradicting ADR-0009/SPEC §13. |
| D8 | Four-facet bilingual Body (formal / plain / inPractice / whyItMatters); revisable. | Facet optionality ("revisit after the pilot") never revisited. |
| D9 | Static-first build; DB deferred until learning/personalisation/semantic search need it. | See ADR-0008 drift. |
| D10 | Framework: Astro (new to you, "adopted to try; reversible"). | Upgraded to Astro 7 (A2). |
| D11 | Source tiers; ≥1 source per term; edge sources encouraged, never blocking. | Met formally, but 125 terms have no source URL and 96 source citations point at the unpublished course compendium, which has no URL (U14). |
| D12 | The 12 edge types incl. `mandates`. | — |
| D13 | Coarse `strength` enum + derived visual weight; no authored continuous weight. | — |

A7 says Cytoscape was "confirmed with the user", and A51 says "the user calls semantic
search vital": those two are **partly owner-driven** (the feature, not every design choice).

---

## 3. Autonomous decisions

Columns: **What** was decided · **Alternatives** realistically available ·
**Cost / consequence** · **Rev.** (reversibility) · **Discuss?** (flag + why).

### 3.1 Stack & hosting

| # | What | Alternatives | Cost / consequence | Rev. | Discuss? |
| --- | --- | --- | --- | --- | --- |
| A1 | Working name "Atlas" (repo `tech-atlas`). | Lexicon, Leksikon, Ordkort, Meridian (SPEC §13 still lists these as open). | Name appears in UI, docs, `localStorage` keys (`atlas:*`); `app/package.json` is still named `lexicon`. | easy now, moderate later | **Med** — a product name for a Danish audience is yours to pick; SPEC §13 still says open. |
| A2 | Upgraded Astro 5 → 7.3.4 to clear a critical + high advisory. | Stay on 5 with an audit exception; pin a patched 5.x. | Newest major; ecosystem (`@astrojs/check` 0.9, editor JSON schema, A21) lags. | moderate | **Low** — security-driven, sensible. |
| A3 | MIT licence for the repo. | Apache-2.0; MIT for code + CC BY 4.0 / CC BY-SA for content; all rights reserved for content. | MIT now covers the **content** too by default, and the repo also ships CC BY-SA wordlists (U16). | easy for code; content licence hard to tighten once published | **High** — content licensing is a real choice (see U16). |
| A4 | Gitignore raw inputs (compendium PDF, docx, `_ingest/`, demos). | Private submodule; separate private repo. | Keeps copyrighted course material out of a public repo. Source material is not versioned anywhere shared. | easy | **Low** — correct call; confirm where the originals are backed up. |
| A5 | App in `app/`, specs in `design/`. | Monorepo with packages (content / site / scripts); content in a separate repo. | Content, scripts and site are one npm package; fine at this size (T4). | moderate | **Low**. |
| A16 | Manual `[lang]` routing; Astro i18n config dropped; `/` meta-refreshes to `/en/`; `hreflang` added. | Astro i18n with `prefixDefaultLocale`; Danish default; language detection on `/`. | **The Danish first user lands in English** (`app/src/pages/index.astro`). No i18n library (U29). | easy (default language); moderate (i18n lib) | **High** — default language for the anchor user. |
| A17 | Hosted on GitHub Pages at `https://cmaintz.github.io/tech-atlas/`, deploy on every push to `main`. | Cloudflare Pages / Netlify (headers, previews, custom domain); GitHub Pages + custom domain. | No response headers (no CSP, HSTS config), **shared `cmaintz.github.io` origin** (U20), 100 MB file limit (drove A55), URLs tied to your username. | moderate (URLs change) | **High** — hosting + origin + domain decide security and URL permanence. |
| A21 | Leave Astro 7's editor-JSON-schema warning; `schema.ts` stays on standalone zod 3. | Move `schema.ts` to `astro/zod` (zod 4). | Two zod versions in play: `content.config.ts` uses `astro/zod` for articles and zod 3 for terms. No IDE schema help for YAML authors. | easy–moderate | **Low** — housekeeping; do it with the next schema change. |

### 3.2 Content model & authoring

| # | What | Alternatives | Cost / consequence | Rev. | Discuss? |
| --- | --- | --- | --- | --- | --- |
| A14 | Closed Vocabulary base = FrequencyWords top-30k per language (CC BY-SA 4.0, OpenSubtitles-derived) + inflection stripping + Danish-only compound splitting. | Smaller list (10k) = stricter; curated "plain language" list (e.g. Ogden-style); Danish DSL word lists. | 30k subtitle words is permissive (includes words a GRC student may not know), and subtitle corpora have odd gaps (A-list entries like "specification", "numeric" had to be added). Licence mix (U16). | moderate | **High** — this list *is* the definition of "plain language". |
| A15 | All content `draft: true`, including the seed terms. | Mark seed terms reviewed; review in batches before adding more. | 255/255 drafts; the public site shows a draft banner on every entry (U13). | easy per term; the review itself is the cost | **High** — the review workflow is the biggest open item (F2). |
| A18 | Lint E5 (circular definition) deferred. | Build it now over the auto-link graph (A38 already finds which terms each definition names). | A promised build-blocking error is missing; SPEC §5 still lists it. | moderate | **Med** — A38 made E5 much cheaper; decide build or drop. |
| A19 | Symmetric edges authored on the alphabetically-first id. | Allow either side and dedupe at build. | Deterministic; W7 catches duplicates. | easy | **Low**. |
| A32 | `content/manifest.yaml` is block-style YAML regenerated from the term files. | Drop the manifest and derive the id list from files. | The manifest duplicates the term files; "source of truth" for ids is now the files, so the manifest's purpose (parallel writers) has lapsed. | easy | **Low** — consider deleting it (T3). |
| A40 | Review queue page `/[lang]/review/` listing drafts with "Edit on GitHub" links. | Local review CLI; a PR-per-batch review; a CMS (F13). | Approving means hand-editing YAML on GitHub, one file at a time, 255 times. | easy | **High** — part of the review-workflow question (F2). |

### 3.3 Derived data & graph

| # | What | Alternatives | Cost / consequence | Rev. | Discuss? |
| --- | --- | --- | --- | --- | --- |
| A7 | Cytoscape.js for 2D; 3d-force-graph for 3D (*3D "deferred" part superseded by A25*). Partly owner-confirmed. | Sigma.js/graphology (WebGL, scales further); D3-force; vis-network. | Two graph libraries + three.js (0.186) in the bundle. | moderate | **Low**. |
| A27 | One graph model (`app/src/lib/graph-model.ts`) shared by build script and site; `/graph.json` served statically. | Separate build-time and runtime code. | Good; whole graph shipped to the client (T5). | easy | **Low**. |
| A29 | Seven edge *families* drive colour and filters instead of 12 raw types. | Colour by raw type; two-level legend. | Readable legend; exact type only in labels. SPEC §7 amended. | easy | **Low**. |
| A38 | Auto-linking of first mentions in body prose (longest name wins, EN/DA inflections, loanwords on Danish pages); Mentions derived and shown as "Mentioned in"; feeds W6. | Author links explicitly; link every mention. | Heuristic linker (`app/src/lib/autolink.ts`) can mislink everyday words (hence B4.5). | easy | **Low**. |
| A42 | `era` flows through the derived graph; helpers in `app/src/lib/era.ts`. | — | — | easy | **Low**. |
| B4.5 | Auto-linking stop-list for everyday words + domain-aware collision resolution (PR #6). | Manual per-term "don't link" flags. | Stop-list is hand-maintained. | easy | **Low**. |

### 3.4 UI / UX

| # | What | Alternatives | Cost / consequence | Rev. | Discuss? |
| --- | --- | --- | --- | --- | --- |
| A22 | *(Status note, superseded)* v1.0 shipped as SPEC §11 steps 1–4 minus Articles; gaps closed by A25, A26, A31, A41. | — | — | — | **Low**. |
| A25 | Explorer: 2D force / depth-layered, 3D (height = Depth), domain + family filters, route finder (shortest path, edges treated as two-way), prerequisite highlighting, `?focus=` deep links. | Fewer modes; directed routes only. | Explorer is `client:only` (nothing without JS); 513-line component. Route finder treats `contrasts-with` and `requires` alike when finding a path. | moderate | **Med** — are undirected "routes" meaningful to a learner? |
| A26 | Term pages: sticky sidebar graph (colour = cluster) + "What to learn first" (all transitive prerequisites). | Direct prerequisites only; collapsible list. | Depends on `requires` quality, which is unreviewed. | easy | **Low**. |
| ~~A28~~ | ~~Era view deferred~~ — *superseded by A41*. | | | | — |
| A33 | Explorer progressive: focal term + direct edges; "Expand +1"; "Whole map". | Always whole map. | Matches SPEC §7. | easy | **Low**. |
| A41 | Timeline `/[lang]/timeline/` by decade + Explorer "By time" layout; undated terms omitted and counted. | Timeline only in the Explorer. | 149 of 255 terms undated, so the view is partial. | easy | **Low**. |
| A43 | Timeline domain filter is CSS-only (`:has()` rules); zero JS. *Partly superseded by A44 (account island adds JS when accounts are configured).* | Small island. | `:has()` needs Safari 15.4+ / Firefox 121+ (U32). | easy | **Low**. |

### 3.5 Learning

| # | What | Alternatives | Cost / consequence | Rev. | Discuss? |
| --- | --- | --- | --- | --- | --- |
| A24 | Learner progress local-first in `localStorage` (*extended by A44*). | Accounts from day one. | Clearing site data loses progress when signed out; shared origin (U20). | easy | **Low**. |
| A34 | Quizzes generated from edges (definition → term, contrasts, prerequisites, mitigates/mandates/exploits); distractors from same cluster/domain, excluding relatives. | Hand-authored questions; LLM-generated questions reviewed per term. | Quiz quality = edge quality, and edges are unreviewed. | easy | **Med** — you should try a session before relying on it. |
| A35 | Spaced repetition = Leitner boxes (0/1/3/7/16/35 days); wrong resets to box 1. | SM-2 / FSRS (better scheduling, more parameters). | Simple and explainable. | easy (data has box + due) | **Low**. |
| A36 | Personal knowledge map: Know / Familiar / Learning / Don't understand; three right answers in a row = known; "Recommended next" = unknown terms whose prerequisites are known. | Two-state known/unknown; mastery from quiz data only. | Self-rating and quiz-derived mastery can disagree. | easy | **Low**. |
| A50 | No migration from `atlas:learner:v1`; one key, one format. | Write a migration. | Fine: no users existed. Sets a precedent: **the next format change will need a migration** once real users exist. | easy | **Low**. |

### 3.6 Search (lexical, intents, semantic)

| # | What | Alternatives | Cost / consequence | Rev. | Discuss? |
| --- | --- | --- | --- | --- | --- |
| A39 | Search intents: "X vs Y" → compare, "how are X and Y related" / "from X to Y" / "X -> Y" → route, "before X" / "før X" → prerequisites. | Plain search only; explicit UI buttons. | Regex intent parser (`app/src/lib/intent.ts`); only EN/DA phrasings. | easy | **Low**. |
| B4.6 | Danish "mod" is a compare separator only after "sammenlign". | — | Avoids false compare intents. | easy | **Low**. |
| A51 | Static semantic search: `Xenova/multilingual-e5-small` pinned to HF commit `761b726d…`, q8, query embedded in the browser in a web worker; each term scores its better language. | Lexical only; server-side embedding API (paid, needs a server); a smaller English-only model; a hosted search service (Algolia etc.). | Works with no server, cross-language. Costs a ~135 MB one-off download per device; model and tokenizer come from huggingface.co; transformers.js 4.3 still sends probes to the `main` revision. | moderate | **High** — biggest single cost/complexity item in the product; owner asked for "semantic search", not this design. |
| A52 | Vectors committed (`app/public/semantic/vectors.json`, ~280 KB), not built in CI; E11 blocks on missing/removed terms or other settings; W8 warns on stale text; 16 fixture queries tested offline. | Build vectors in CI (download model each run); cache the model in CI. | **Every contributor who adds or removes a term must run `npm run embed` locally** (downloads the model, needs `onnxruntime-node`). Raises the bar for non-developer contributors (F13). | moderate | **Med**. |
| A53 | Model loads only on demand; first download opt-in with a size warning; persistent storage requested; auto afterwards if still cached; explicit off switch; no automatic retries. | Always-on; never auto. | Respectful of data and privacy; adds UI states. | easy | **Low**. |
| A54 | Hybrid ranking = reciprocal rank fusion (k = 60) of semantic hits and lexical names/aliases search; semantic hits kept within 0.03 cosine of the best; "by meaning" label. | Weighted score blend; semantic re-ranking of lexical hits only. | Tuned on 16 fixture queries; thresholds are magic numbers. | easy | **Low**. |
| A55 | ONNX runtime self-hosted; model stays on Hugging Face (Pages 100 MB limit); `onnxruntime-web` pinned to **`1.31.0-dev.20260914-8d85527a0`, a dev prerelease**; CI sets `ONNXRUNTIME_NODE_INSTALL=skip`. | Wait for a stable release; host the model on a CDN / R2 / HF only. | Production depends on a prerelease runtime (27 MB wasm in `dist`). PR #12's body still says the runtime comes from jsDelivr — **the PR body is stale; A55 is what shipped.** | moderate | **Med** — accept the prerelease with a revisit trigger? |

### 3.7 Accounts & sync

| # | What | Alternatives | Cost / consequence | Rev. | Discuss? |
| --- | --- | --- | --- | --- | --- |
| A44 | Optional accounts + synced progress via Supabase free tier, called from the browser; enabled only when `PUBLIC_SUPABASE_URL` + `PUBLIC_SUPABASE_ANON_KEY` repo variables are set. **Supersedes part of ADR-0008.** | No accounts (export/import a progress file); Firebase; PocketBase/self-hosted; Cloudflare D1 + Workers; GitHub Gist sync. | Introduces personal data, a vendor, GDPR duties (U25), and an origin-sharing risk (U20). **Never run against a live project** (PR #10: "Not exercised against a live Supabase project"). Currently dormant (no variables set). | moderate (feature is config-gated) | **High** — do you want accounts at all, and if so on which vendor and region? |
| A45 | Learner state v2 with per-term `reviewed` / `statusAt` timestamps; one `learner_state` jsonb row per user; pure commutative merge (`app/src/lib/sync.ts`). | Per-term rows; event log / CRDT. | Whole-document writes; fine at hundreds of terms. | moderate | **Low**. |
| A46 | Auth = email magic link + GitHub OAuth, PKCE. | Passkeys; Google; email + password. | Magic links need custom SMTP to reach anyone outside your Supabase org (`docs/SUPABASE_SETUP.md`), so a sending domain is needed. | easy | **Med** — needs a domain + SMTP provider decision. |
| A47 | "Delete my synced data" = tombstone row + revoke sessions; auth identity stays until you delete the user by hand. Known limitation: a different account on the same browser merges local progress into it. | Edge Function with service key that deletes the auth user; per-user local partitions. | GDPR erasure is **manual for the identity** (email / GitHub id). | moderate | **Med** — erasure completeness. |
| A48 | Monotonic per-term timestamps; far-future timestamps clamped. | Server clock. | — | easy | **Low**. |
| A49 | Optimistic concurrency via server-bumped `version`; up to 4 retries. | Last-write-wins. | — | easy | **Low**. |

### 3.8 CI / tooling

| # | What | Alternatives | Cost / consequence | Rev. | Discuss? |
| --- | --- | --- | --- | --- | --- |
| ~~A6~~ | ~~`test` = no-op; `audit` = `npm audit --audit-level=high`~~ — test part *superseded by A23 then A37*; audit part still in force. | `--audit-level=moderate`; OSV scanner. | High/critical only. | easy | **Low**. |
| A23 | `mise run test` runs the production build as a smoke test (*extended by A37*). | Separate build job. | Gate is slower but catches route/content wiring. | easy | **Low**. |
| A37 | Vitest unit tests for pure modules; `test` = unit + build. | + e2e (Playwright), + a11y checks. | 75 unit tests; no browser tests, no coverage floor despite AGENTS.md's "coverage floor" wording (U35). | easy | **Med** — see F6. |
| P7 | *(PR-only, #3/#5/#6/#12)* Headless-Edge smoke tests run by hand as the browser verification. | Playwright in CI. | Not repeatable; not in the gate. | easy | **Med** — folds into F6. |
| P8 | *(PR-only, #1)* A fresh-context AI review is the only code review before merge; PRs were merged under your account. | Owner review; required approvals. | No human has reviewed any merged code. | easy | **High** — who approves merges from now on? |

### 3.9 Content editorial choices

| # | What | Alternatives | Cost / consequence | Rev. | Discuss? |
| --- | --- | --- | --- | --- | --- |
| A8 | IDS and IPS as two terms. | One term with a facet. | Good compare pair. | easy | **Low**. |
| A9 | ISO 27001 and ISO 27002 as two terms. | One term. | — | easy | **Low**. |
| A10 | `backup`, `endpoint` = single shared terms `[security, cs]`; `audit` is the only namespaced collision. | Namespace `policy`, `control`, `patch`, `port` as SPEC §3 listed. | ADR-0003's machinery is exercised by exactly one pair; SPEC §3 still lists 7 collisions. | moderate (URLs include the folder) | **Med** — are `policy` / `control` really one concept? |
| A11 | `two-factor-authentication` own term, `kind-of mfa`. | Alias of MFA (D4's own example treats 2FA/MFA as aliases). | Contradicts the D4 note "2FA/MFA are aliases". | easy | **Med** — small, but contradicts your D4 note. |
| A12 | Batch 2: 20 terms beyond the ordliste (malware, asset, server, HTTPS, …). | Rephrase around them; add to `allowed-words`. | Oracle test (ADR-0002 test 1) replaced by "writers needed them". | easy | **Med** — together with A30 and P2 this changes the granularity rule in practice. |
| A13 | Cryptography added as a fourth CS cluster. | Fold into identity/networking. | Only 7 terms (under the SPEC ten-term bar). | easy | **Low**. |
| A20 | Content fixes from AI review (SSL not a TLS alias, virus not a malware alias, DoS retargeted, incident-reporting edge removed). | — | Good. | easy | **Low**. |
| A30 | Batch 3: 26 terms + 40 enrichment edges (150 total). | — | As A12. | easy | **Med** (with A12). |
| A31 | Articles for 12 security/CS terms, both languages; Danish articles written for a Danish reader, not translated. | English only; fewer articles. | 40 long-form files, all AI-written and unreviewed; exempt from Closed Vocabulary so no lint safety net. | easy | **Med** — articles carry the most unverified factual claims (dates, legal duties). |
| B4.1 | `era` = the year a term entered common use (MFA = 2011; controller/processor = Directive 95/46/EC). | Year of invention/first publication. | **Inconsistent with P3** (regulations use adoption year). Contestable single years shown as fact. | moderate (106 values) | **High** — era semantics need one rule. |
| B4.2 | No `security` domain on ML/LLM terms; security carried by edges. | Tag security-relevant AI terms. | Honest tagging; AI terms don't appear under a security filter. | easy | **Low**. |
| B4.3 | `eu-ai-act`, `ai-governance` have no `layer`. | Add a `governance` layer to the AI domain. | — | easy | **Low**. |
| B4.4 | Proper nouns (EU Cyber Resilience Act, NTIA, Kubernetes) dropped from English prose to pass E1; kept in sources. | Add them to `allowed-words.en.txt`; allow capitalised proper nouns in E1. | Prose becomes vaguer to satisfy a lint rule — a rule tuning question, not a content one. | easy | **Med** — should E1 exempt proper nouns? |
| B4.7 | EU AI Act dates follow the Digital Omnibus (Reg. (EU) 2026/1744): Annex III from 2 Dec 2027, Annex I from 2 Aug 2028, Art. 50 from 2 Aug 2026. | — | Legal dates written by an AI; must be verified by a human before learners rely on them. | easy | **Med** — verify. |
| P1 | *(PR #7 only)* **AI (28) and platform (29) domains added**, with cross-domain edges and `era` on 61 terms. | Stay on CS + security until reviewed (SPEC §11 said "still deferred"). | Doubles unreviewed content outside the first user's course; SPEC §11 still lists these domains as deferred. **Never logged as a decision.** | moderate | **High** — scope change against D3/SPEC. |
| P2 | *(PR #11 only)* Batch 5: 48 terms, three new clusters (application-security, security-operations, web); edges on 21 existing terms. | — | 255 terms; clusters under ten. | easy | **Med**. |
| P3 | *(PR #11 only)* Regulations' `era` = adoption year (GDPR, NIS2, EU AI Act). | Entry-into-application year. | Conflicts with B4.1. | easy | see B4.1. |
| P4 | *(PR #11 only)* `nis2-loven` is its own term; removed as an alias of `nis2`. | Keep as alias. | Danish implementing act vs directive — defensible. | easy | **Low**. |
| P5 | *(PR #11 only)* `cfcs` status `legacy` ("tasks moved to SAMSIK in 2025"). | — | Factual claim to verify. | easy | **Low**. |
| P6 | *(PR #9 only)* 8 AI/platform articles in a fixed structure (history · how it works · coordinator section with a worked scenario starring a fictional Danish GRC student · common misunderstandings). | Free structure. | Fictional personae (e.g. "Emma", "Mads") in Danish organisations — tone choice. | easy | **Low**. |
| P9 | *(PR #12 only)* PR body numbering (A44–A48) and "runtime from jsDelivr" are stale vs. the final A51–A55. | — | Misleading history only. | — | **Low**. |

---

## 4. Unlogged assumptions

True in the repo, never written down as a decision. **Q** = suggested question for you.

### 4.1 Frameworks & libraries

| # | Assumption | Where | Why it matters | Q |
| --- | --- | --- | --- | --- |
| U1 | **Preact** for islands (not React, Svelte, Solid or vanilla). | `app/astro.config.mjs`, `app/package.json` | Your primary stack is TS/JS; Preact is React-compatible but small. Changing later means rewriting 8 islands. | Happy with Preact, or would you rather use React for familiarity/hiring? |
| U2 | **Tailwind v4** (4.3.3) utility classes everywhere; dark-only neutral palette; system font stack. | `app/src/styles/global.css` (`color-scheme: dark`), `app/src/layouts/Base.astro` | No light mode; `design/09_VISUAL_DIRECTION.md` exists in the archive but the built UI was not checked against it. | Keep Tailwind? Should we implement the visual direction doc, and do you want a light mode? |
| U3 | **MiniSearch** (7.2) for lexical search with `fuzzy: 0.2`, `prefix: true`, name boost 3, alias boost 2. | `app/src/components/Search.tsx:140` | Index of all names/aliases/summaries is shipped whole to the client; tuning values are guesses. | OK as is? |
| U4 | **Zod 3.25** standalone alongside Astro's bundled zod. | `app/src/schema.ts`, `app/src/content.config.ts` | Two validator versions (A21). | Migrate to `astro/zod` next schema change? |
| U5 | **Vitest 5**, TypeScript 5.9, `tsx` for scripts, **Prettier only — no ESLint** or other code linter. | `mise.toml` (`lint` = prettier + content lint), `app/package.json` | "Lint" in the gate checks formatting and content, not code (no unused vars, no hook rules, no import rules). Your other projects use ESLint with suppressions baselines. | Add ESLint (typescript-eslint) with a ratchet baseline? |
| U6 | **transformers.js 4.3 + onnxruntime-web dev prerelease**, plus `onnxruntime-node` 1.30 in the lockfile (for `npm run embed`). | `app/package.json`, `app/scripts/embed.ts` | A prerelease in production; a ~GB CUDA download on linux-x64 without the env flag. | Accept with a revisit trigger (next stable ORT)? |
| U7 | **Supabase** as the backend vendor (Auth + Postgres + RLS). | `app/src/lib/account.ts`, `supabase/migrations/` | Vendor lock is small (one table), but auth identities live there. | See A44. |
| U8 | **TypeScript everywhere**; no Python in the repo. | whole repo | You planned Python; nothing needs it yet. Embedding pipeline could be Python but isn't. | Keep the toolchain single-language? (Recommended: yes.) |
| U9 | **Node 22.14.0** via mise; `mise` 2026.8.5 in CI; `ubuntu-latest` runner not pinned. | `mise.toml`, `.github/workflows/*.yml` | Node 22 is LTS; runner image drifts. | Pin runner (`ubuntu-24.04`)? |
| U10 | **No dependency-update automation** (no Dependabot/Renovate); caret ranges + lockfile; actions SHA-pinned but never bumped. | `app/package.json`, `.github/` (workflows only) | Security fixes arrive only when someone runs `npm audit` locally or CI fails. | Enable Renovate/Dependabot with grouped weekly PRs? |

### 4.2 Content & authoring

| # | Assumption | Where | Why it matters | Q |
| --- | --- | --- | --- | --- |
| U11 | **YAML** for terms (not Markdown frontmatter or JSON); ADR-0003/0004 text still says `.md`. | `app/src/content/terms/**.yaml`, `app/content/AUTHORING.md` | YAML is hand-editable but whitespace-fragile; block-style rule exists because prettier rewrapped inline maps (A32). | Keep YAML? Fix the ADR wording? |
| U12 | **Folder = namespace = URL segment**: `/en/terms/security/phishing/`. Moving a term between folders changes its URL. | `app/src/pages/[lang]/terms/[...slug].astro`, `app/src/content.config.ts` | ADR-0003 planned `/term/token` bare URLs + disambiguation; the built URLs include the domain folder. | Are current URLs the permanent scheme? (See U22.) |
| U13 | **All 255 terms and 40 article files are AI-drafted**; `draft: true` everywhere; public site shows them with a draft banner. | all term files; `app/src/pages/[lang]/terms/[...slug].astro:106` | The product's promise ("robust data", ADR-0005) rests on a human pass that hasn't started. | See F2. |
| U14 | **Sources were chosen by the AI and never verified**: 125 terms have no URL; 96 source citations point at "Cyber Security Fast Track — Ordliste" (unpublished, no URL). No external link checker. | term `sources:` blocks | Hallucinated or wrong citations are the classic AI failure mode; a reader cannot check the compendium citation. | Should a link checker run in CI? Is the compendium an acceptable public citation? |
| U15 | **Danish advisory has become "Danish unlinted"**: 151 advisory warnings, `allowed-words.da.txt` has 9 entries. | `npx tsx app/scripts/lint.ts`, `app/content/allowed-words.da.txt` | ADR-0009's trigger has fired; warnings nobody reads are silent debt, which ADR-0009 set out to avoid. | Flip to blocking now, set a ratchet (no new warnings), or grow the DA list first? |
| U16 | **Licensing**: repo MIT (A3) with no separate content licence, so definitions and articles are MIT by default; `app/content/wordlists/*.txt` are **CC BY-SA 4.0** (ShareAlike) in the same repo; Danish security definitions were **seeded from the copyrighted course compendium** (D4, AUTHORING.md); model `multilingual-e5-small` is MIT. No attribution on the site. | `LICENSE`, `app/content/wordlists/README.md`, `app/content/AUTHORING.md` | Mixed licences with no statement; compendium-derived wording may need the course owner's OK. | Content licence (CC BY 4.0? CC BY-SA? reserved)? Ask happy42.dk for permission/attribution? |
| U17 | **Content quality bar is implicit**: "3–5 edges", "1–3 sentences per facet", "natural Danish" are guidance only; not linted. | `app/content/AUTHORING.md` | Without a written bar, a human reviewer has nothing to approve against. | Write a short review checklist (see F2)? |
| U18 | **Clusters are free strings** (`cluster: z.string()`); labels/colours hard-coded in `site.ts`. | `app/src/schema.ts`, `app/src/lib/site.ts` | A typo creates a new cluster silently. | Make cluster an enum per domain? |
| U19 | **Coverage target unmet**: SPEC §11 step 4 "no cluster under ten" is failed by 9 clusters. | lint coverage line | The "done when" criterion of an approved roadmap step is not met. | Fill clusters, merge small ones, or drop the rule? |

### 4.3 Hosting, security & privacy

| # | Assumption | Where | Why it matters | Q |
| --- | --- | --- | --- | --- |
| U20 | **Shared origin**: the site lives on `cmaintz.github.io`, the same origin as every other Pages site under your user. `localStorage` (learner state, and the **Supabase session token** when accounts are on, `persistSession: true`) is readable by any page on that origin. | `app/astro.config.mjs` (`site`, `base`), `app/src/lib/account.ts:70` | Any other repo you publish to Pages (or a compromised one) could read Atlas session tokens. | Move to a custom domain or subdomain before enabling accounts? (Recommended: yes.) |
| U21 | **No custom domain**; all URLs, Supabase redirect URLs and the OAuth app are tied to `cmaintz.github.io/tech-atlas/`. | `docs/SUPABASE_SETUP.md`, `astro.config.mjs` | Moving later breaks inbound links/SEO and needs auth reconfiguration. | Buy a domain now (e.g. a `.dk`)? |
| U22 | **URL scheme stability not promised**: `/[lang]/terms/<folder>/<id>/`, `/[lang]/compare/<a>-vs-<b>/`, `/[lang]/articles/<folder>/<id>/`. No redirects mechanism on Pages. | `app/src/pages/[lang]/**` | Renaming an id or folder silently 404s old links. | Declare ids permanent and add a redirect/alias list? |
| U23 | **No CSP or security headers** (Pages cannot set headers; no `<meta http-equiv>` CSP). Worker fetches from `huggingface.co`; Supabase from `*.supabase.co`. | `app/src/layouts/Base.astro` | XSS defence-in-depth missing, more important once sessions exist. | Add a meta CSP now; move to a host with headers later? |
| U24 | **No analytics or error reporting.** | whole repo | You cannot tell whether the first user uses it, or whether semantic search fails in the wild. | Privacy-friendly analytics (Plausible/Umami/GoatCounter) or none? |
| U25 | **Privacy/GDPR of the site itself not addressed**: no privacy notice; the site talks to GitHub Pages (IP logs), huggingface.co (US, after opt-in) and Supabase (if enabled; region only *suggested* as Frankfurt); magic-link emails go through a third-party SMTP provider; you are the data controller. `localStorage` use is strictly functional (no consent banner needed for that). | `docs/SUPABASE_SETUP.md`, `app/src/components/semantic.worker.ts` | A Danish/EU audience + accounts = GDPR duties (notice, processor agreements, erasure — A47 leaves identities). | Write a privacy page before enabling accounts? Require EU region? |
| U26 | **No Supabase backup/ops plan**: free tier pauses after 7 idle days; free-tier backup guarantees are limited (verify current Supabase terms); no export. | `docs/SUPABASE_SETUP.md` | Learner progress could be lost; paused project = "could not sync". | Acceptable for a study tool? Weekly `pg_dump` via Action? |
| U27 | **Open sign-up, no abuse limits**: anyone can create an account and write up to 512 KB; no captcha or rate-limit configuration documented. | `supabase/migrations/20260923000000_learner_state.sql` | Free-tier quota exhaustion; email-sending abuse via magic links. | Enable Supabase captcha / rate limits? |
| U28 | **Deploy is not gated on the gate**: `deploy.yml` runs `npm run build` (content lint + build) on push to `main` but not typecheck/unit tests/audit, and does not depend on `gate.yml`. Branch protection status unknown. | `.github/workflows/deploy.yml` | A red gate on `main` can still deploy. | Require `gate` as a status check and make deploy depend on it? |

### 4.4 UX, accessibility, i18n, SEO, performance

| # | Assumption | Where | Why it matters | Q |
| --- | --- | --- | --- | --- |
| U29 | **i18n by hand**: `[lang]` routes, UI strings as a 378-line object in `site.ts`, `Localized = {en, da}.strict()` in the schema. | `app/src/lib/site.ts`, `app/src/schema.ts` | A third language touches the schema (strict object), every term file, and all UI strings. | Is EN+DA the permanent set? (Decides whether to invest in an i18n layer; see F9.) |
| U30 | **English is the default language** at `/`. | `app/src/pages/index.astro` | The anchor user reads Danish (ADR-0007). | Default to Danish, or detect `navigator.language`? |
| U31 | **No accessibility target** (no WCAG level); ~7 `aria-*`/`role` attributes in all components; graphs are canvas-only; Explorer/Study/Account/KnowledgeStatus are `client:only` (blank without JS); colour carries meaning (cluster, family, knowledge). | `app/src/components/*.tsx`, `app/src/pages/[lang]/**` | Public education site in the EU; European Accessibility Act awareness. | Target WCAG 2.2 AA for reading surfaces, and a text fallback for graphs? |
| U32 | **Browser support undefined**: semantic search needs WASM SIMD + module workers; Timeline filter needs `:has()`; Vite default build targets. | `app/src/components/semantic.worker.ts`, timeline page | Older school/work machines may break silently. | Support "last 2 versions + Safari 16"? |
| U33 | **SEO is minimal**: `hreflang` only; no sitemap, `robots.txt`, per-page canonical, Open Graph tags or `DefinedTerm` structured data; **drafts are indexed**. | `app/src/layouts/Base.astro` | SEO for the lookup user was an ADR-0008 argument. Indexing unreviewed AI text may not be what you want. | Add sitemap + OG + structured data? `noindex` drafts until reviewed? |
| U34 | **No performance budget**: three.js, Cytoscape, MiniSearch index, `graph.json`, 276 KB vectors and 27 MB ORT wasm (lazy) all grow with content. | `app/package.json`, `app/public/semantic/` | The first user is "on a phone, mid-lookup" (SPEC §2). | Set budgets (e.g. term page ≤ 100 KB JS) and check in CI? |

### 4.5 Process & repo

| # | Assumption | Where | Why it matters | Q |
| --- | --- | --- | --- | --- |
| U35 | **Test strategy = unit + build only**; browser checks were manual (P7); no e2e, visual, a11y or link tests in CI; AGENTS.md promises a "coverage floor" that doesn't exist. | `mise.toml`, `AGENTS.md` | Islands (Search, Explorer, Account) are the riskiest code and have no automated tests. | See F6. |
| U36 | **AI-written commits carry your identity** (all 50 commits are by CMaintz; no co-author trailer). | `git log` | Provenance: history doesn't show what was AI-written. | Add a `Co-authored-by` convention for agent commits? |
| U37 | **Stale and duplicated docs**: `design/schema.ts` is a diverged copy of `app/src/schema.ts` (different header, extra types); SPEC §5 vs §13 (Danish blocking vs advisory), §11 (ai/platform "deferred"), §13 (name still open), §14 ("adr 0001–0004", "D1–D12"); AGENTS.md "(none yet)" for tests; `app/README.md` "3D later"; AUTONOMOUS_DECISIONS status header (124 terms). | listed files | Agents are told "spec wins", and the spec is wrong in places. | Approve a doc-refresh PR after this review? |
| U38 | **Archive material in the repo root**: `techlexicon/` (an earlier conception with its own ADRs), `deep-research-report.md`, `design/00–09`. | repo root, `design/` | Agents may read the wrong ADRs (`techlexicon/docs/adr`). | Move to `design/archive/` or delete? |

---

## 5. Tech & architecture never properly decided

| # | Area | What exists (by default) | Risk | Options | Tentative rec. |
| --- | --- | --- | --- | --- | --- |
| T1 | State management | Module-level singletons + `window` `CustomEvent('atlas:learner')` + `localStorage`; each island re-reads on the event (`app/src/lib/learner.ts`, `account.ts`). | Fine at 8 islands; implicit contracts between islands. | (a) keep; (b) nanostores (Astro's recommended cross-island store); (c) Preact signals. | (b) nanostores if islands grow; keep for now. |
| T2 | Component architecture | 8 Preact islands, largest 513 lines (`Explorer.tsx`); page logic in `.astro` files; UI strings passed as props. | Explorer and Search mix data, layout and rendering. | (a) keep; (b) split Explorer into hooks + view; (c) headless modules + thin views. | (b) when next touched. |
| T3 | Content pipeline | `load-terms.ts` (YAML + Zod) for scripts, Astro content layer for the site, plus `manifest.yaml`; derived graph written to `src/generated/graph.json` before `astro build`. | Two load paths + a manifest can disagree. | (a) keep; (b) single loader used by both; (c) drop manifest. | (b)+(c). |
| T4 | Repo shape | Single npm package in `app/` holding site, content, scripts. | Content contributors must install the whole site (incl. transformers/onnx). | (a) keep; (b) npm workspaces: `content/`, `site/`, `tools/`; (c) separate content repo. | (a) until non-developer contributors exist; then (b). |
| T5 | Derived data & caching | Whole graph, search index and vectors are static JSON loaded in full by the client; recomputed on every build. | Linear growth; fine to low thousands. | (a) keep; (b) per-domain shards + lazy load; (c) server/edge API. | (a); revisit at ~1,500 terms. |
| T6 | Scaling past ~1,000 terms | Build time, lint time (Closed Vocabulary over all prose), Cytoscape "Whole map", MiniSearch index, vectors (~1.1 KB per term) all scale linearly; the human review is the real bottleneck. | Hairball at "Whole map"; slower gate. | (a) keep; (b) WebGL graph (Sigma.js) + sharded indexes; (c) DB-backed (ADR-0008's deferred option). | (a) now; measure at 500. |
| T7 | Search index growth | `search-index.json` ships names, aliases, summaries in both languages. | ~300–400 KB at 1,000 terms. | (a) keep; (b) names/aliases only, summaries on demand; (c) Pagefind (static, chunked). | (c) Pagefind worth evaluating at 500+ terms. |
| T8 | Error handling & logging | UI shows errors locally (sync dot, "Try again"); no reporting; scripts `console.log` and exit codes. | Field failures invisible. | (a) keep; (b) Sentry-free tier; (c) a tiny self-hosted error beacon (Supabase table). | (a) until there are users; then (b) with privacy notice. |
| T9 | Config & feature flags | Accounts toggled by build-time env vars; semantic search always compiled in. | Fine. | — | Keep. |
| T10 | Schema evolution | Zod `.strict()`; no schema version field in term files; no migration tooling. | Every schema change is an all-files sweep. | (a) keep + codemods; (b) `schemaVersion` + migration scripts. | (a); scripts in `app/scripts/`. |
| T11 | Build determinism of derived artefacts | `src/generated/` gitignored and rebuilt; `vectors.json` committed. | Mixed rules (A52 is the exception). | — | Keep; documented in A52. |

---

## 6. Future work

Each item: open questions, 2–3 realistic options, tentative recommendation.

| # | Item | Open questions | Options | Tentative rec. |
| --- | --- | --- | --- | --- |
| F1 | **AI tutor** (deferred by you; SPEC §11) | Where does the model run? What does it see (graph + term text only)? Cost? Hallucination vs. the curated graph? | (a) client-side small LLM (WebLLM) — heavy download; (b) server function calling a hosted LLM API with RAG over term YAML + graph (needs a backend, key, budget); (c) no tutor; "explain this path" built deterministically from edges + `why`. | (c) first — it's on-thesis (learning generated from relationships); (b) later on a serverless function with strict grounding. |
| F2 | **Human review workflow for 255 drafts** | Who reviews (you, course teachers, SMEs)? What is the checklist? Batch size? Does Danish get a native-speaker pass? | (a) edit YAML on GitHub per file (today, A40); (b) review PR per cluster with a checklist and diff view; (c) a local review UI (`npm run review`) that shows the rendered entry + lint and flips `draft` with a `reviewedBy/reviewedAt` field. | (b) now, add `reviewedBy`/`reviewedAt` to the schema; (c) if review stalls. Freeze new content until security clusters are reviewed. |
| F3 | **Content growth plan** | Next domains or depth? Oracle for non-course terms? Target size? | (a) finish the course scope to "reviewed"; (b) deepen existing clusters to ≥10; (c) new domains. | (a) → (b); no new domains until review catches up. |
| F4 | **Custom domain** | `.dk` or `.com`? Subdomain of an existing domain? | (a) `atlas.<yourdomain>` on Pages; (b) apex on Cloudflare Pages; (c) stay on `github.io`. | (a) or (b) **before** enabling accounts (fixes U20, U21). |
| F5 | **Hosting beyond free tiers / headers** | Need headers (CSP), previews, redirects? | (a) GitHub Pages + meta CSP; (b) Cloudflare Pages (free, `_headers`, `_redirects`, previews); (c) Netlify. | (b) — free, headers, redirects, preview deploys per PR. |
| F6 | **E2E / browser tests** | Which flows are critical? Run on every PR? | (a) Playwright in the gate for 5 smoke flows (term page EN/DA, search + intent, Explorer loads, study question, Timeline filter); (b) + axe-core a11y checks; (c) visual regression. | (a)+(b); semantic search mocked (no 135 MB download in CI). |
| F7 | **CSP / security headers** | Which third parties are allowed? | (a) `<meta>` CSP (no `frame-ancestors`/reporting); (b) real headers via F5; (c) none. | (a) now, (b) with F5. |
| F8 | **Analytics** | Do you want usage data at all? Consent? | (a) none; (b) cookieless Plausible/Umami/GoatCounter; (c) GA (no). | (b) GoatCounter or Umami, disclosed in a privacy page — or (a) if you prefer. |
| F9 | **More languages** | Which (Swedish/Norwegian? German)? Machine-drafted? Closed Vocabulary per language? | (a) generalise `Localized` to a record of locales + i18n lib (e.g. Paraglide); (b) keep EN+DA strict; (c) UI-only localisation. | (b) unless a real user needs a third language; if so (a) — a schema-wide change. |
| F10 | **PWA / offline** | Offline lookup on a phone? Cache semantic model? | (a) service worker (Workbox / `@vite-pwa/astro`) caching pages + indexes; (b) none. | (a) — cheap, fits "lookup on a phone"; exclude the model. |
| F11 | **Mobile app** | Is a store app needed? | (a) PWA (F10); (b) Capacitor wrapper; (c) native Swift/Kotlin. | (a). Native adds nothing the site can't do. |
| F12 | **Accounts go-live** (A44 dormant) | Vendor, region, SMTP domain, privacy notice, erasure, backups? | (a) Supabase EU + custom SMTP + privacy page + Edge Function for full erasure; (b) drop accounts, add "export/import progress" file; (c) other backend. | Decide after F4. (b) is the lightest path for one course cohort; (a) if cross-device matters. |
| F13 | **Editor / CMS for non-developers** | Who edits besides you? Git-based? | (a) Decap/Sveltia CMS (git-based, works with YAML + GitHub); (b) Keystatic (Astro-friendly, git-backed); (c) GitHub web editor + review PRs. | (c) now; (b) Keystatic if course staff contribute. Note A52: new terms need `npm run embed`, so a CI job that embeds on PR would be needed. |
| F14 | **Community contributions** | Open to the public? Moderation? CLA? Content licence (U16)? | (a) closed; (b) PRs welcome with CONTRIBUTING + templates; (c) suggestion form → issue. | (c) first (low effort, you stay the editor). |
| F15 | **Public API / data export** | Who would consume it? Licence? | (a) publish `graph.json` + a `terms.json` dump as documented static endpoints; (b) SKOS/JSON-LD export; (c) none. | (a) — it already exists (`/graph.json`); document it once the licence is set. |
| F16 | **More quiz types** | Which kinds (matching, ordering prerequisites, "which is not a kind of X", free recall)? | (a) more edge-generated kinds; (b) hand-authored questions for articles; (c) LLM-generated then reviewed. | (a) — ordering-by-prerequisite and "odd one out" fall out of the graph. |
| F17 | **Lint promises not yet built** | E5, W2, W3, depth histogram + collision-list reports, Disambiguation pages. | (a) build all; (b) build E5 + Disambiguation, drop the rest; (c) drop from SPEC. | (b); E5 is now cheap on top of A38. |
| F18 | **Dependency & runtime upkeep** | Who bumps deps; ORT prerelease exit? | (a) Renovate grouped weekly; (b) manual monthly; (c) none. | (a), plus an issue to track ORT stable. |
| F19 | **Link / source verification** | Check URLs in `sources`? Archive them? | (a) lychee in CI (weekly, not per-PR); (b) manual; (c) none. | (a). |

---

## 7. Suggested agenda

Ordered by value of your input × cost of getting it wrong later.

1. **Scope drift** — AI + platform domains (P1) and ~95 beyond-oracle terms (A12, A30, P2) were added without a decision; SPEC still says deferred. Keep, freeze, or unpublish?
2. **Review workflow for 255 AI drafts** (A15, A40, U13, F2) — who, checklist, batch order, and whether to freeze new content until reviewed.
3. **Licensing** (A3, U16) — content licence, CC BY-SA wordlists, compendium-derived Danish wording, attribution on the site.
4. **Danish Closed Vocabulary** (ADR-0009 trigger, U15) — 151 advisory warnings: flip, ratchet, or grow `allowed-words.da.txt`.
5. **Hosting, origin and domain** (A17, U20, U21, U23, F4, F5) — custom domain + a host with headers before any accounts go live.
6. **Accounts: go live or not** (A44–A47, U25–U27, F12) — vendor, EU region, privacy notice, erasure, backups; or a file export instead.
7. **Semantic search cost** (A51–A55, U6) — 135 MB download, Hugging Face dependency, prerelease runtime, embed step for contributors. Keep as designed?
8. **Default language and first-user experience** (A16, U30) — should `/` go to Danish?
9. **Era semantics** (B4.1 vs P3) — one rule for all 106 dated terms.
10. **Closed Vocabulary tuning** (A14, B4.4) — 30k subtitle words as "plain language"; exempt proper nouns?
11. **Merge authority and gating** (P8, U28, U36) — who approves PRs; deploy depends on the gate; commit provenance.
12. **Approved-but-unbuilt items** (ADR-0003 Disambiguation, ADR-0002 W2, A18 E5, F17) and the unmet "no cluster under ten" rule (U19).
13. **Test strategy** (A37, P7, U35, F6) — add Playwright + axe smoke tests to the gate?
14. **Accessibility, browsers, SEO** (U31–U33) — WCAG target, `noindex` drafts, sitemap/OG.
15. **Doc and repo cleanup** (U37, U38, A32) — refresh SPEC/AGENTS/README, one schema file, archive `techlexicon/`, rename package, drop the manifest.
16. **Code tooling** (U5, U10) — ESLint with a baseline; Renovate.
17. **AI tutor direction** (F1) — confirm "deterministic explanations from edges first".
