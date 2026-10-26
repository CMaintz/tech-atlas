import { z } from 'zod';
import { EDGE_TYPES, QUESTION_KINDS, Source, type EdgeType } from '../../src/schema';
import type { AtlasBundle } from './bundle';

const localized = z.object({ en: z.string().min(1), da: z.string().min(1) });
const names = z.object({ en: z.array(z.string()), da: z.array(z.string()) });

const distTerm = z.object({
  id: z.string().regex(/^[a-z]+\/[a-z0-9-]+$/),
  url: localized,
  term: localized,
  aka: names,
  domain: z.array(z.string()).min(1),
  cluster: z.string(),
  summary: localized,
  body: z.record(z.string(), localized),
  sources: z.array(Source),
  depth: z.number(),
});

const edgeType = z.enum(Object.keys(EDGE_TYPES) as [EdgeType, ...EdgeType[]]);
const distGraph = z.object({
  links: z.array(z.object({ source: z.string(), target: z.string(), type: edgeType })),
});

const distSearchDoc = z.object({
  id: z.string(),
  term: localized,
  aka: names,
  summary: localized,
  contrasts: z.array(z.string()),
});

const distQuestion = z.object({
  id: z.string(),
  terms: z.array(z.string()),
  kind: z.enum(QUESTION_KINDS),
  stem: z.string(),
  options: z.array(z.string()).min(2),
  answer: z.number().int(),
  explanation: z.string(),
  difficulty: z.number(),
  answeredBy: z.array(z.string()),
});

const distSchema = z.object({
  terms: z.object({ terms: z.array(distTerm).min(1) }),
  graph: distGraph,
  search: z.array(distSearchDoc),
  questionsEn: z.array(distQuestion),
  questionsDa: z.array(distQuestion),
});

export function toBundle(dist: unknown): AtlasBundle {
  const d = distSchema.parse(dist);
  return {
    terms: d.terms.terms,
    links: d.graph.links.map(({ source, target, type }) => ({ source, target, type })),
    search: d.search,
    questions: { en: d.questionsEn, da: d.questionsDa },
  };
}
