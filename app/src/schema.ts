import { z } from 'zod';

/**
 * Atlas — the authored Term schema (v1). See design/SPEC.md and design/adr/.
 * Bilingual (EN+DA), fully-faceted Body, curated closed edge set, rich edges.
 * Anything derived (depth, inverse edges, mentions, visual weight, collisions)
 * is computed at build time (see scripts/build-graph.ts) and never authored.
 */

/* ---- Bilingual strings (ADR-0007) ---------------------------------- */

export const Localized = z.object({ en: z.string(), da: z.string() }).strict();
export type Localized = z.infer<typeof Localized>;

const LocalizedMax = (n: number) =>
  z.object({ en: z.string().min(1).max(n), da: z.string().min(1).max(n) }).strict();

export const LocalizedList = z
  .object({
    en: z.array(z.string()).default([]),
    da: z.array(z.string()).default([]),
  })
  .strict();

/* ---- Identity ------------------------------------------------------- */

export const TermId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be kebab-case');

export const Domain = z.enum(['security', 'cs', 'ai', 'platform']);
export type Domain = z.infer<typeof Domain>;

export const TermRef = z
  .string()
  .regex(
    /^(security\/|cs\/|ai\/|platform\/)?[a-z0-9]+(-[a-z0-9]+)*$/,
    'must be `id` or `domain/id`, kebab-case',
  );

/* ---- Sources & provenance (ADR / D11) ------------------------------ */

export const SourceTier = z.enum([
  'standard',
  'official-doc',
  'course-material',
  'reference',
  'textbook',
  'other',
]);

export const Source = z
  .object({
    title: z.string().min(1),
    url: z.string().url().optional(),
    tier: SourceTier.default('other'),
    publisher: z.string().optional(),
  })
  .strict();
export type Source = z.infer<typeof Source>;

/* ---- Edges — curated closed set + rich first-class edges (ADR-0006) - */

export const EDGE_TYPES = {
  requires: { inverse: 'unlocks', symmetric: false },
  'kind-of': { inverse: 'has-kind', symmetric: false },
  'part-of': { inverse: 'has-part', symmetric: false },
  implements: { inverse: 'implemented-by', symmetric: false },
  'contrasts-with': { inverse: 'contrasts-with', symmetric: true },
  'alternative-to': { inverse: 'alternative-to', symmetric: true },
  supersedes: { inverse: 'superseded-by', symmetric: false },
  mitigates: { inverse: 'mitigated-by', symmetric: false },
  exploits: { inverse: 'exploited-by', symmetric: false },
  causes: { inverse: 'caused-by', symmetric: false },
  'used-with': { inverse: 'used-with', symmetric: true },
  mandates: { inverse: 'mandated-by', symmetric: false },
} as const;

export type EdgeType = keyof typeof EDGE_TYPES;

export const RichEdge = z
  .object({
    to: TermRef,
    why: Localized.optional(),
    confidence: z.enum(['high', 'medium', 'low']).default('high'),
    strength: z.enum(['primary', 'normal', 'minor']).default('normal'),
    sources: z.array(Source).default([]),
  })
  .strict();
export type RichEdge = z.infer<typeof RichEdge>;

export const Edge = z.union([TermRef, RichEdge]);

export const Edges = z
  .object(
    Object.fromEntries(Object.keys(EDGE_TYPES).map((k) => [k, z.array(Edge).optional()])) as Record<
      EdgeType,
      z.ZodOptional<z.ZodArray<typeof Edge>>
    >,
  )
  .strict();

/* ---- Layer — a facet, never a position (ADR-0001) ------------------ */

export const LAYERS = {
  cs: [
    'hardware',
    'architecture',
    'os',
    'runtime',
    'network',
    'identity',
    'language',
    'framework',
    'application',
    'theory',
  ],
  security: ['network', 'host', 'application', 'data', 'identity', 'people', 'governance'],
  ai: ['hardware', 'model', 'training', 'inference', 'agent', 'application', 'theory'],
  platform: ['infrastructure', 'orchestration', 'delivery', 'observability', 'process'],
} as const;

const AnyLayer = z.enum(Object.values(LAYERS).flat() as [string, ...string[]]);

/* ---- Body — fully faceted, bilingual, Closed Vocabulary (ADR-0004/9) */

export const Body = z
  .object({
    formal: Localized,
    plain: Localized,
    inPractice: Localized,
    whyItMatters: Localized,
  })
  .strict();
export type Body = z.infer<typeof Body>;

/* ---- Term frontmatter ---------------------------------------------- */

export const TermFrontmatter = z
  .object({
    id: TermId,
    term: Localized,
    aka: LocalizedList.default({ en: [], da: [] }),
    domain: z.array(Domain).min(1),
    cluster: z.string().min(1),
    layer: AnyLayer.optional(),
    era: z.number().int().min(1930).max(2100).optional(),
    status: z.enum(['current', 'legacy', 'emerging']).default('current'),
    summary: LocalizedMax(140),
    body: Body,
    /**
     * Optional technical deep dive for the term page (A79): plain text, paragraphs
     * separated by a blank line. Exempt from Closed Vocabulary, like an Article.
     */
    deepDive: z
      .object({ en: z.string().min(1), da: z.string().min(1) })
      .strict()
      .optional(),
    edges: Edges.default({}),
    article: z.object({ en: z.string().optional(), da: z.string().optional() }).strict().optional(),
    sources: z.array(Source).min(1),
    draft: z.boolean().default(false),
  })
  .strict();

export type TermFrontmatter = z.infer<typeof TermFrontmatter>;

/**
 * The content-collection schema: a Term minus `id`, which Astro's glob loader
 * derives from the file path. Used by src/content.config.ts.
 */
export const TermData = TermFrontmatter.omit({ id: true });
export type TermData = z.infer<typeof TermData>;
