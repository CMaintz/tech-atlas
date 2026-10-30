import { z } from 'zod';

export const Localized = z.object({ en: z.string(), da: z.string() }).strict();
export type Localized = z.infer<typeof Localized>;

const LocalizedMax = (n: number) =>
  z.object({ en: z.string().min(1).max(n), da: z.string().min(1).max(n) }).strict();

const LocalizedList = z
  .object({
    en: z.array(z.string()).default([]),
    da: z.array(z.string()).default([]),
  })
  .strict();

const TermId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be kebab-case');

const Domain = z.enum(['security', 'cs', 'ai', 'platform']);
type Domain = z.infer<typeof Domain>;

const TermRef = z
  .string()
  .regex(
    /^(security\/|cs\/|ai\/|platform\/)?[a-z0-9]+(-[a-z0-9]+)*$/,
    'must be `id` or `domain/id`, kebab-case',
  );

const SourceTier = z.enum([
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
    url: z
      .url()
      .regex(/^https?:\/\//, 'must be an http(s) URL')
      .optional(),
    tier: SourceTier.default('other'),
    publisher: z.string().optional(),
  })
  .strict();
export type Source = z.infer<typeof Source>;

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

const RichEdge = z
  .object({
    to: TermRef,
    why: Localized.optional(),
    confidence: z.enum(['high', 'medium', 'low']).default('high'),
    strength: z.enum(['primary', 'normal', 'minor']).default('normal'),
    sources: z.array(Source).default([]),
  })
  .strict();
type RichEdge = z.infer<typeof RichEdge>;

const Edge = z.union([TermRef, RichEdge]);

const Edges = z
  .object(
    Object.fromEntries(Object.keys(EDGE_TYPES).map((k) => [k, z.array(Edge).optional()])) as Record<
      EdgeType,
      z.ZodOptional<z.ZodArray<typeof Edge>>
    >,
  )
  .strict();

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

const Body = z
  .object({
    formal: Localized,
    plain: Localized,
    inPractice: Localized,
    whyItMatters: Localized,
  })
  .strict();
type Body = z.infer<typeof Body>;

const StepList = (min: number, max: number) =>
  z
    .object({
      en: z.array(z.string().min(1)).min(min).max(max),
      da: z.array(z.string().min(1)).min(min).max(max),
    })
    .strict()
    .refine((l) => l.en.length === l.da.length, {
      message: 'en and da must have the same number of items',
    });

export const HowToGuide = z
  .object({
    title: z.string().min(1),
    url: z.url().regex(/^https?:\/\//, 'must be an http(s) URL'),
    publisher: z.string().min(1),
    tier: SourceTier,
    lang: z.enum(['en', 'da']).optional(),
  })
  .strict();
export type HowToGuide = z.infer<typeof HowToGuide>;

export const HowTo = z
  .object({
    steps: StepList(5, 10),
    pitfalls: StepList(1, 8).optional(),
    guides: z.array(HowToGuide).min(2).max(5),
  })
  .strict();
export type HowTo = z.infer<typeof HowTo>;

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
    deepDive: z
      .object({ en: z.string().min(1), da: z.string().min(1) })
      .strict()
      .optional(),
    actionable: z.boolean().optional(),
    howTo: HowTo.optional(),
    edges: Edges.default({}),
    article: z.object({ en: z.string().optional(), da: z.string().optional() }).strict().optional(),
    sources: z.array(Source).min(1),
    draft: z.boolean().default(false),
  })
  .strict();

export type TermFrontmatter = z.infer<typeof TermFrontmatter>;

export const TermData = TermFrontmatter.omit({ id: true });
export type TermData = z.infer<typeof TermData>;

const TermKey = z
  .string()
  .regex(/^(security|cs|ai|platform)\/[a-z0-9]+(-[a-z0-9]+)*$/, 'must be `domain/id`, kebab-case');

const QUESTION_KINDS = ['scenario', 'concept', 'compare', 'order', 'true-false'] as const;

export const Question = z
  .object({
    id: TermId,
    terms: z.array(TermKey).min(1),
    kind: z.enum(QUESTION_KINDS),
    stem: LocalizedMax(1200),
    options: z.array(LocalizedMax(300)).min(2).max(4),
    answer: z.number().int().min(0),
    explanation: LocalizedMax(2000),
    difficulty: z.number().int().min(1).max(3),
    sources: z.array(Source).min(1),
    draft: z.boolean().default(false),
  })
  .strict()
  .superRefine((q, ctx) => {
    const want = q.kind === 'true-false' ? 2 : 4;
    if (q.options.length !== want)
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: `a ${q.kind} question has ${want} options`,
      });
    if (q.answer >= q.options.length)
      ctx.addIssue({
        code: 'custom',
        path: ['answer'],
        message: 'answer must index an option',
      });
  });
export type Question = z.infer<typeof Question>;

export const QuestionFile = z.object({ questions: z.array(Question).min(1) }).strict();
export type QuestionFile = z.infer<typeof QuestionFile>;
