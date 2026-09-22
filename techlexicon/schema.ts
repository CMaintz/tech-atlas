import { z } from "zod";

/**
 * The authored shape of a Term. Everything here is written by hand;
 * anything derived (Depth, inverse Edges, Mentions, Disambiguation pages)
 * is computed at build time and never appears in a content file.
 *
 * See CONTEXT.md for the vocabulary and docs/adr/ for why.
 */

/* ------------------------------------------------------------------ *
 * Identity
 * ------------------------------------------------------------------ */

/** Kebab-case, unique within a Domain. Also the URL slug. */
export const TermId = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be kebab-case");

export const Domain = z.enum(["cs", "security", "ai", "platform"]);
export type Domain = z.infer<typeof Domain>;

/**
 * A pointer to another Term, either bare (`mutex`) or namespaced
 * (`security/token`). Bare references resolve within the referring Term's
 * own Domain; lint rejects a bare reference whose name exists in more than
 * one Domain. See ADR-0003.
 */
export const TermRef = z
  .string()
  .regex(
    /^(cs\/|security\/|ai\/|platform\/)?[a-z0-9]+(-[a-z0-9]+)*$/,
    "must be `id` or `domain/id`, kebab-case",
  );

/* ------------------------------------------------------------------ *
 * Edges
 * ------------------------------------------------------------------ */

/**
 * The closed set of authored Edge Types, each paired with the inverse
 * generated at build time. Authors write one direction only.
 *
 * Adding a type here is a deliberate schema change: every type costs a
 * colour, a filter, a legend entry and an authoring decision. Symmetric
 * types are their own inverse.
 */
export const EDGE_TYPES = {
  /** Must be understood first. Acyclic; the graph that Depth is computed from. */
  requires: { inverse: "unlocks", symmetric: false },
  /** Taxonomic parent: `spinlock` kind-of `lock`. */
  "kind-of": { inverse: "has-kind", symmetric: false },
  /** Composition: `tcp-handshake` part-of `tcp`. */
  "part-of": { inverse: "has-part", symmetric: false },
  /** Easily confused, meaningfully different. Drives the compare view. */
  "contrasts-with": { inverse: "contrasts-with", symmetric: true },
  /** Concrete realises abstract: `raft` implements `consensus`. */
  implements: { inverse: "implemented-by", symmetric: false },
  /** Replaced in practice: `tls` supersedes `ssl`. */
  supersedes: { inverse: "superseded-by", symmetric: false },
  /** Goes wrong like this: `mutex` causes `deadlock`. */
  causes: { inverse: "caused-by", symmetric: false },
  /** Security: control against a weakness. `salting` mitigates `rainbow-table-attack`. */
  mitigates: { inverse: "mitigated-by", symmetric: false },
  /** Security: attack against a weakness. `sql-injection` exploits `input-validation`. */
  exploits: { inverse: "exploited-by", symmetric: false },
} as const;

export type EdgeType = keyof typeof EDGE_TYPES;

export const Edges = z
  .object(
    Object.fromEntries(
      Object.keys(EDGE_TYPES).map((k) => [k, z.array(TermRef).optional()]),
    ) as Record<EdgeType, z.ZodOptional<z.ZodArray<typeof TermRef>>>,
  )
  .strict();

/* ------------------------------------------------------------------ *
 * Layer — a facet, never a position. See ADR-0001.
 * ------------------------------------------------------------------ */

export const LAYERS = {
  cs: [
    "hardware",
    "architecture",
    "os",
    "runtime",
    "language",
    "framework",
    "application",
    "theory",
  ],
  security: [
    "network",
    "host",
    "application",
    "data",
    "identity",
    "people",
    "governance",
  ],
  ai: ["hardware", "model", "training", "inference", "agent", "application", "theory"],
  platform: ["infrastructure", "orchestration", "delivery", "observability", "process"],
} as const;

const AnyLayer = z.enum(
  Object.values(LAYERS).flat() as [string, ...string[]],
);

/* ------------------------------------------------------------------ *
 * Term frontmatter
 * ------------------------------------------------------------------ */

export const TermFrontmatter = z
  .object({
    /** Unique within Domain; matches the filename. */
    id: TermId,

    /** Display form, properly cased: "Mutex", "TLS", "Race Condition". */
    term: z.string().min(1),

    /**
     * Other names for the *same* concept. Searchable, and they redirect here.
     * Two concepts that merely relate closely are separate Terms with an Edge.
     */
    aka: z.array(z.string()).default([]),

    /** Every Domain this Term genuinely belongs to. See ADR-0003. */
    domain: z.array(Domain).min(1),

    /** The one group this Term is taught alongside. `concurrency`, `cryptography`. */
    cluster: z.string().min(1),

    /** Optional facet. Must belong to one of this Term's Domains — checked by lint. */
    layer: AnyLayer.optional(),

    /** Year the idea entered common use. Powers the era view; omit when unclear. */
    era: z.number().int().min(1930).max(2100).optional(),

    /** `legacy` and `emerging` are rendered differently; they are not deprecations. */
    status: z.enum(["current", "legacy", "emerging"]).default("current"),

    /**
     * The one-sentence definition. Closed Vocabulary, enforced.
     * Must not open by restating the term ("A mutex is a mutex that...").
     */
    summary: z.string().min(1).max(140),

    /** Typed relationships, authored one direction only. */
    edges: Edges.default({}),

    /**
     * Optional long-form piece, exempt from Closed Vocabulary. See ADR-0004.
     * Path relative to the content root.
     */
    article: z.string().optional(),

    /** Where this definition came from — RFCs, specs, textbooks, course material. */
    sources: z
      .array(z.object({ title: z.string(), url: z.string().url().optional() }))
      .default([]),

    /** Set while a Term is LLM-drafted and not yet edited by a human. */
    draft: z.boolean().default(false),
  })
  .strict();

export type TermFrontmatter = z.infer<typeof TermFrontmatter>;

/* ------------------------------------------------------------------ *
 * Derived at build — never authored, never committed.
 * ------------------------------------------------------------------ */

export type CompiledTerm = TermFrontmatter & {
  /** Longest path to this Term through `requires`. ADR-0001. */
  depth: number;
  /** Authored Edges plus every generated inverse. */
  resolvedEdges: Array<{ type: string; to: string; generated: boolean }>;
  /** Untyped Edges harvested from prose auto-links. */
  mentions: string[];
  /** True when another Domain holds a different Term of the same name. */
  collides: boolean;
};
