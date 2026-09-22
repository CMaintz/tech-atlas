import { z } from "zod";

/**
 * Unified Term schema — v1.
 *
 * Encodes the decisions in UNIFIED_VISION.md (D1–D12):
 *  - Dictionary-primary, relationships as the leverage point (D1).
 *  - Curated *closed* edge set + rich first-class edges; no `related_to` (D2, D12).
 *  - Two co-equal launch clusters: security (GRC) + CS (networking/OS/identity) (D3, D6).
 *  - Fully bilingual EN + DA — every human-facing string is `{ en, da }` (D5).
 *  - Closed Vocabulary on `summary` + `body`, enforced by lint in both languages (D7).
 *  - Fully faceted Body: formal / plain / inPractice / whyItMatters (D8).
 *  - Static-first: these are authored content files; anything derived (Depth,
 *    inverse edges, Mentions, Disambiguation) is computed at build time (D9).
 *
 * Everything here is authored by hand. Derived data lives in CompiledTerm.
 */

/* ------------------------------------------------------------------ *
 * Bilingual strings (D5)
 * ------------------------------------------------------------------ */

/** Every human-facing string carries both languages. English is canonical. */
export const Localized = z.object({ en: z.string(), da: z.string() }).strict();
export type Localized = z.infer<typeof Localized>;

const LocalizedMax = (n: number) =>
  z.object({ en: z.string().min(1).max(n), da: z.string().min(1).max(n) }).strict();

/** Aliases, per language — searchable, redirect to the Term. */
export const LocalizedList = z
  .object({ en: z.array(z.string()).default([]), da: z.array(z.string()).default([]) })
  .strict();

/* ------------------------------------------------------------------ *
 * Identity
 * ------------------------------------------------------------------ */

/** Kebab-case, unique within a Domain. Canonical (English-based) slug + URL. */
export const TermId = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be kebab-case");

/** Modelled from day one (ADR-0003); only `security` + `cs` are populated in v1. */
export const Domain = z.enum(["security", "cs", "ai", "platform"]);
export type Domain = z.infer<typeof Domain>;

/**
 * A pointer to another Term, bare (`phishing`) or namespaced (`cs/policy`).
 * Bare refs resolve within the referring Term's Domain; lint rejects a bare ref
 * whose name exists in more than one Domain (ADR-0003, lint E3).
 */
export const TermRef = z
  .string()
  .regex(
    /^(security\/|cs\/|ai\/|platform\/)?[a-z0-9]+(-[a-z0-9]+)*$/,
    "must be `id` or `domain/id`, kebab-case",
  );

/* ------------------------------------------------------------------ *
 * Sources & provenance (D11)
 * ------------------------------------------------------------------ */

/** Preference tiers, best first. Lint may warn on `other` but never blocks. */
export const SourceTier = z.enum([
  "standard",       // NIST, ISO 27001, NIS2/GDPR text, CIS, RFCs
  "official-doc",   // official vendor/project documentation
  "course-material",// the Cyber Security Fast Track compendium (the oracle)
  "reference",      // CNCF, OWASP, Wikipedia (orientation)
  "textbook",       // OSTEP, CLRS, etc.
  "other",
]);

export const Source = z
  .object({
    title: z.string().min(1),
    url: z.string().url().optional(),
    tier: SourceTier.default("other"),
    publisher: z.string().optional(),
  })
  .strict();
export type Source = z.infer<typeof Source>;

/* ------------------------------------------------------------------ *
 * Edges — curated closed set + rich first-class edges (D2, D12)
 * ------------------------------------------------------------------ */

/**
 * The closed set of authored Edge Types, each paired with its build-generated
 * inverse. Authors write one direction only. Symmetric types are their own
 * inverse. Adding a type is a deliberate schema change (it costs a colour, a
 * filter, a legend entry and an authoring decision). There is deliberately **no
 * `related_to` catch-all** — loose association is captured by auto-derived
 * Mentions, never authored (D2).
 *
 * Deferred candidates (not in v1, revisit if authoring demands them):
 *   depends-on, abstraction-of, instance-of, example-of, assesses/measures.
 */
export const EDGE_TYPES = {
  /** Conceptual prerequisite — must be understood first. Acyclic; Depth source (ADR-0001). */
  requires: { inverse: "unlocks", symmetric: false },
  /** Taxonomic parent: `spear-phishing` kind-of `phishing`. */
  "kind-of": { inverse: "has-kind", symmetric: false },
  /** Composition: `confidentiality` part-of `cia-triad`. */
  "part-of": { inverse: "has-part", symmetric: false },
  /** Concrete realises abstract: `mfa` implements `authentication`. */
  implements: { inverse: "implemented-by", symmetric: false },
  /** Easily confused, meaningfully different. Drives the compare view. Symmetric. */
  "contrasts-with": { inverse: "contrasts-with", symmetric: true },
  /** Competing solution to a similar problem. Symmetric. */
  "alternative-to": { inverse: "alternative-to", symmetric: true },
  /** Replaced in practice: `nis2` supersedes `nis1`. */
  supersedes: { inverse: "superseded-by", symmetric: false },
  /** Control against a weakness: `mfa` mitigates `credential-theft`. */
  mitigates: { inverse: "mitigated-by", symmetric: false },
  /** Attack against a weakness: `phishing` exploits `human-trust`. */
  exploits: { inverse: "exploited-by", symmetric: false },
  /** Failure mode: `misconfiguration` causes `data-breach`. */
  causes: { inverse: "caused-by", symmetric: false },
  /** Commonly combined in practice: `siem` used-with `ids`. Symmetric. */
  "used-with": { inverse: "used-with", symmetric: true },
  /** Regulation requires a control/practice: `nis2` mandates `incident-reporting`. */
  mandates: { inverse: "mandated-by", symmetric: false },
} as const;

export type EdgeType = keyof typeof EDGE_TYPES;

/**
 * A single authored edge. In the common (structural) case, authoring just the
 * target string is enough. Rich edges add an explanation, a confidence, and
 * sources — encouraged for claim-like edges (mitigates/exploits/causes) per the
 * sourcing policy (D11), optional for structural ones.
 */
export const RichEdge = z
  .object({
    to: TermRef,
    /** Why the relationship holds — makes the graph explainable, not decorative. */
    why: Localized.optional(),
    /** How sure we are the relationship is TRUE. (Not how strong it is — see `strength`.) */
    confidence: z.enum(["high", "medium", "low"]).default("high"),
    /**
     * Optional coarse salience — how central/strong THIS relationship is. Author only
     * where it genuinely matters: `mfa` mitigates `credential-theft` is `primary`;
     * `awareness` mitigates `phishing` is partial → `normal`/`minor`. Most meaningful
     * on gradient edges (requires/mitigates/exploits/causes/used-with); rarely on
     * taxonomy. A continuous numeric weight is deliberately NOT authored (it repeats
     * ADR-0001's hand-assigned-scalar trap); the *visual* weight for edge thickness
     * and layout is DERIVED at build (see CompiledTerm.resolvedEdges.weight).
     */
    strength: z.enum(["primary", "normal", "minor"]).default("normal"),
    sources: z.array(Source).default([]),
  })
  .strict();
export type RichEdge = z.infer<typeof RichEdge>;

/** An edge is either a bare target (`"authentication"`) or a RichEdge object. */
export const Edge = z.union([TermRef, RichEdge]);

export const Edges = z
  .object(
    Object.fromEntries(
      Object.keys(EDGE_TYPES).map((k) => [k, z.array(Edge).optional()]),
    ) as Record<EdgeType, z.ZodOptional<z.ZodArray<typeof Edge>>>,
  )
  .strict();

/* ------------------------------------------------------------------ *
 * Layer — a facet, never a position (ADR-0001). Per Domain.
 * ------------------------------------------------------------------ */

export const LAYERS = {
  // CS extended with `network` + `identity` for the v1 cluster (D6).
  cs: [
    "hardware", "architecture", "os", "runtime", "network",
    "identity", "language", "framework", "application", "theory",
  ],
  security: [
    "network", "host", "application", "data",
    "identity", "people", "governance",
  ],
  ai: ["hardware", "model", "training", "inference", "agent", "application", "theory"],
  platform: ["infrastructure", "orchestration", "delivery", "observability", "process"],
} as const;

const AnyLayer = z.enum(Object.values(LAYERS).flat() as [string, ...string[]]);

/* ------------------------------------------------------------------ *
 * Body — fully faceted, bilingual, Closed Vocabulary (D7, D8)
 * ------------------------------------------------------------------ */

/**
 * Four facets, each bilingual, each under Closed Vocabulary (lint E1, both
 * languages). Keep each facet to 1–3 sentences; real depth goes to the Article.
 * All four are mandated for now; the set is revisable to optional later if some
 * read formulaic on simple terms (user note, 2026-09-21).
 */
export const Body = z
  .object({
    /** Canonical technical definition (precise; distinct from the ≤140 `summary`). */
    formal: Localized,
    /** Plain-English rendering that breaks circular terminology. */
    plain: Localized,
    /** Operational / real-world meaning. */
    inPractice: Localized,
    /** Why the concept exists / why it matters. */
    whyItMatters: Localized,
  })
  .strict();
export type Body = z.infer<typeof Body>;

/* ------------------------------------------------------------------ *
 * Term frontmatter
 * ------------------------------------------------------------------ */

export const TermFrontmatter = z
  .object({
    /** Unique within Domain; matches the filename; the URL slug. */
    id: TermId,

    /** Display form per language: e.g. { en: "Phishing", da: "Phishing" }. */
    term: Localized,

    /** Other names for the SAME concept, per language. Searchable; redirect here. */
    aka: LocalizedList.default({ en: [], da: [] }),

    /** Every Domain this Term genuinely belongs to (ADR-0003). */
    domain: z.array(Domain).min(1),

    /** The one group taught alongside — maps onto the ordliste's 7 groups (D4). */
    cluster: z.string().min(1),

    /** Optional facet; must belong to one of this Term's Domains (lint E8). */
    layer: AnyLayer.optional(),

    /** Year the idea entered common use. Powers the era view; omit when unclear. */
    era: z.number().int().min(1930).max(2100).optional(),

    /** `legacy` and `emerging` render differently; they are not deprecations. */
    status: z.enum(["current", "legacy", "emerging"]).default("current"),

    /** One-sentence lookup line, ≤140 per language. Closed Vocabulary (lint E1). */
    summary: LocalizedMax(140),

    /** The four-facet explanation. Closed Vocabulary, both languages (D7, D8). */
    body: Body,

    /** Typed relationships, authored one direction only; inverses generated. */
    edges: Edges.default({}),

    /** Optional long-form, exempt from Closed Vocabulary (ADR-0004). Paths per language. */
    article: z.object({ en: z.string().optional(), da: z.string().optional() }).strict().optional(),

    /** Where the definition came from. Policy: ≥1 per Term (D11). */
    sources: z.array(Source).min(1),

    /** Set while LLM-drafted and not yet human-edited. Draft ratio reported (W5). */
    draft: z.boolean().default(false),
  })
  .strict();

export type TermFrontmatter = z.infer<typeof TermFrontmatter>;

/* ------------------------------------------------------------------ *
 * Derived at build — never authored, never committed (D9, ADR-0001).
 * ------------------------------------------------------------------ */

export type CompiledTerm = TermFrontmatter & {
  /** Longest path to this Term through `requires`. */
  depth: number;
  /** Authored edges plus every generated inverse, normalised to objects. */
  resolvedEdges: Array<{
    type: string;
    to: string;
    generated: boolean;
    why?: Localized;
    confidence?: "high" | "medium" | "low";
    strength?: "primary" | "normal" | "minor";
    /** Derived visual weight (edge type + endpoint degree + strength + confidence). */
    weight: number;
  }>;
  /** Untyped edges harvested from prose auto-links (the only "loose" relation). */
  mentions: string[];
  /** True when another Domain holds a different Term of the same name. */
  collides: boolean;
};
