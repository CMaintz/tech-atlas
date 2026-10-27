import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Lang } from './bundle';
import type { ToolContext } from './context';
import { ATTRIBUTED, fail, langSchema, READ_ONLY, reply, withLicence } from './reply';
import { termRef, termRefSchema } from './views';

// The semantic-search function's own MAX_K; asking for more would be refused upstream.
const MAX_SEMANTIC_LIMIT = 20;
const UPSTREAM_TIMEOUT_MS = 7000;

const SEMANTIC = {
  title: 'Search Atlas by meaning',
  description: withLicence(
    'Find Atlas terms that match a question or description in your own words (embedding search, English or Danish). Rate-limited more tightly than the other tools.',
  ),
  inputSchema: {
    query: z.string().min(1).max(200),
    lang: langSchema.optional().describe('Language of the query; default en'),
    limit: z.number().int().min(1).max(MAX_SEMANTIC_LIMIT).optional(),
  },
  outputSchema: { results: z.array(termRefSchema.extend({ score: z.number() })), ...ATTRIBUTED },
  annotations: READ_ONLY,
};

const hitsSchema = z.object({ hits: z.array(z.object({ id: z.string(), score: z.number() })) });

type SemanticArgs = { query: string; lang?: Lang; limit?: number };

async function upstream(
  ctx: ToolContext,
  url: string,
  { query, lang = 'en', limit = 8 }: SemanticArgs,
) {
  const res = await ctx.fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ q: query, lang, k: limit }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`semantic-search answered HTTP ${res.status}`);
  return hitsSchema.parse(await res.json()).hits;
}

function joined(ctx: ToolContext, hits: { id: string; score: number }[], lang: Lang) {
  return hits.flatMap(({ id, score }) => {
    const term = ctx.atlas.byId.get(id);
    return term ? [{ ...termRef(term, lang), score }] : [];
  });
}

// Every MCP caller reaches the function from the Worker's egress IPs and so shares its
// per-IP limit and daily cap with the site; the global key caps the MCP's share of that.
async function withinBudget({ env, ip }: ToolContext): Promise<boolean> {
  if (!(await env.SEMANTIC_LIMITER.limit({ key: ip })).success) return false;
  return (await env.SEMANTIC_GLOBAL_LIMITER.limit({ key: 'all' })).success;
}

const semantic = (ctx: ToolContext) => async (args: SemanticArgs) => {
  const url = ctx.env.SEMANTIC_SEARCH_URL;
  if (!url) return fail('Search by meaning is not configured here; use search_terms.');
  if (!(await withinBudget(ctx)))
    return fail('semantic_search rate limit reached; wait a minute or use search_terms.');
  try {
    return reply({ results: joined(ctx, await upstream(ctx, url, args), args.lang ?? 'en') });
  } catch (err) {
    console.error('semantic_search', err instanceof Error ? err.message : err);
    return fail('Search by meaning failed upstream; use search_terms instead.');
  }
};

export function registerSemanticTool(server: McpServer, ctx: ToolContext): void {
  server.registerTool('semantic_search', SEMANTIC, semantic(ctx));
}
