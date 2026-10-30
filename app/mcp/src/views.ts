import { z } from 'zod';
import type { BundleTerm, Lang } from './bundle';

const localized = z.object({ en: z.string(), da: z.string() });
const source = z.object({
  title: z.string(),
  url: z.string().optional(),
  tier: z.string(),
  publisher: z.string().optional(),
});

export const termViewSchema = z.object({
  id: z.string().describe('Atlas id, `domain/id`'),
  name: localized,
  aka: z.object({ en: z.array(z.string()), da: z.array(z.string()) }),
  domain: z.array(z.string()),
  cluster: z.string(),
  summary: localized,
  body: z.record(z.string(), localized).describe('Facets: formal, plain, inPractice, ...'),
  sources: z.array(source),
  url: localized.describe('The term page on the site, per language'),
});

export const termRefSchema = z.object({
  id: z.string(),
  name: localized,
  summary: z.string(),
  url: z.string(),
});

export const termView = (t: BundleTerm): z.infer<typeof termViewSchema> => ({
  id: t.id,
  name: t.term,
  aka: t.aka,
  domain: t.domain,
  cluster: t.cluster,
  summary: t.summary,
  body: t.body,
  sources: t.sources,
  url: t.url,
});

export const termRef = (t: BundleTerm, lang: Lang): z.infer<typeof termRefSchema> => ({
  id: t.id,
  name: t.term,
  summary: t.summary[lang],
  url: t.url[lang],
});
