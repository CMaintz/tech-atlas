import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { BundleTerm, Lang } from './bundle';
import type { ToolContext } from './context';
import { ATTRIBUTED, fail, langSchema, READ_ONLY, reply, withLicence } from './reply';
import { termRef, termRefSchema, termView, termViewSchema } from './views';

const MAX_SEARCH_LIMIT = 25;
const DEFAULT_SEARCH_LIMIT = 8;

export const termArg = z
  .string()
  .min(1)
  .max(200)
  .describe('An Atlas id (`domain/id` or just `id`) or a name in English or Danish');

type Scored = { term: BundleTerm; score: number };

type LexicalQuery = { query: string; lang: Lang; domain?: string };

function lexical(ctx: ToolContext, { query, lang, domain }: LexicalQuery): Scored[] {
  const scored: Scored[] = [];
  for (const hit of ctx.atlas.engine(lang).search(query)) {
    const term = ctx.atlas.byId.get(hit.id as string);
    if (term && (!domain || term.domain.includes(domain))) scored.push({ term, score: hit.score });
  }
  return scored;
}

export function notFound(ctx: ToolContext, ref: string) {
  const near = lexical(ctx, { query: ref, lang: 'en' }).slice(0, 5);
  const hint = near.length ? ` Closest: ${near.map((n) => n.term.id).join(', ')}.` : '';
  return fail(`No Atlas term is named "${ref}".${hint} Try search_terms.`);
}

const LOOKUP = {
  title: 'Look up an Atlas term',
  description: withLicence(
    'Look up one term of Atlas, the English-Danish technical dictionary, by id or by name in either language. Returns both names, the summary, body facets, sources and the site URL.',
  ),
  inputSchema: {
    term: termArg,
    lang: langSchema.optional().describe('Prefer names in this language when several match'),
  },
  outputSchema: { term: termViewSchema, alsoMatches: z.array(z.string()), ...ATTRIBUTED },
  annotations: READ_ONLY,
};

const lookup =
  (ctx: ToolContext) =>
  async ({ term, lang }: { term: string; lang?: Lang }) => {
    const found = ctx.atlas.resolve(term, { lang });
    if (!found) return notFound(ctx, term);
    return reply({ term: termView(found.term), alsoMatches: found.alsoMatches });
  };

const TRANSLATE = {
  title: 'Translate a technical term',
  description: withLicence(
    'Translate a technical term between English and Danish with Atlas: the curated name in the other language plus its accepted alternatives.',
  ),
  inputSchema: { term: termArg, from: langSchema.describe('The language `term` is written in') },
  outputSchema: {
    id: z.string(),
    from: langSchema,
    to: langSchema,
    term: z.string(),
    translation: z.string(),
    alternatives: z.array(z.string()).describe('Other accepted names in the target language'),
    otherMatches: z.array(z.string()).describe('Other terms the same words name'),
    ...ATTRIBUTED,
  },
  annotations: READ_ONLY,
};

const translate =
  (ctx: ToolContext) =>
  async ({ term, from }: { term: string; from: Lang }) => {
    const found = ctx.atlas.resolve(term, { only: from });
    if (!found) return notFound(ctx, term);
    const to: Lang = from === 'en' ? 'da' : 'en';
    const { id, term: names, aka } = found.term;
    return reply({
      ...{ id, from, to, term: names[from], translation: names[to] },
      alternatives: aka[to].filter((a) => a !== names[to]),
      otherMatches: found.alsoMatches,
    });
  };

const SEARCH = {
  title: 'Search Atlas by name',
  description: withLicence(
    'Search Atlas terms by name, alias and summary words (lexical, typo-tolerant), in English or Danish. For a question in your own words, use semantic_search.',
  ),
  inputSchema: {
    query: z.string().min(1).max(200),
    lang: langSchema.optional().describe('Language of the summaries searched; default en'),
    domain: z.enum(['security', 'cs', 'ai', 'platform']).optional(),
    limit: z.number().int().min(1).max(MAX_SEARCH_LIMIT).optional(),
  },
  outputSchema: { results: z.array(termRefSchema.extend({ score: z.number() })), ...ATTRIBUTED },
  annotations: READ_ONLY,
};

type SearchArgs = { query: string; lang?: Lang; domain?: string; limit?: number };

const search =
  (ctx: ToolContext) =>
  async ({ query, lang = 'en', domain, limit = DEFAULT_SEARCH_LIMIT }: SearchArgs) => {
    const hits = lexical(ctx, { query, lang, domain }).slice(0, limit);
    const score = (s: number) => Number(s.toFixed(3));
    return reply({
      results: hits.map((h) => ({ ...termRef(h.term, lang), score: score(h.score) })),
    });
  };

export function registerTermTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool('lookup_term', LOOKUP, lookup(ctx));
  server.registerTool('translate_term', TRANSLATE, translate(ctx));
  server.registerTool('search_terms', SEARCH, search(ctx));
}
