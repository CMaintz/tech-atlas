import { ResourceTemplate, type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ATTRIBUTION } from './attribution';
import type { BundleTerm } from './bundle';
import type { ToolContext } from './context';
import { termView } from './views';

const uriOf = (id: string) => `atlas://terms/${id}`;

function resourceBody(term: BundleTerm, uri: string) {
  const text = JSON.stringify({ ...termView(term), attribution: ATTRIBUTION });
  return { contents: [{ uri, mimeType: 'application/json', text }] };
}

const TERM_TEMPLATE = 'atlas://terms/{domain}/{id}';
const TERM_RESOURCE = {
  description: 'One Atlas term as JSON (CC BY-SA 4.0; credit with `attribution`).',
};

const listTerms = (ctx: ToolContext) => async () => ({
  resources: ctx.atlas.bundle.terms.map((t) => ({
    uri: uriOf(t.id),
    name: `${t.term.en} / ${t.term.da}`,
    mimeType: 'application/json',
  })),
});

const readTerm = (ctx: ToolContext) => async (uri: URL, vars: Record<string, unknown>) => {
  const term = ctx.atlas.byId.get(`${vars.domain}/${vars.id}`);
  if (!term) throw new Error(`No Atlas term at ${uri.href}`);
  return resourceBody(term, uri.href);
};

function registerTermResource(server: McpServer, ctx: ToolContext): void {
  const template = new ResourceTemplate(TERM_TEMPLATE, { list: listTerms(ctx) });
  server.registerResource('atlas-term', template, TERM_RESOURCE, readTerm(ctx));
}

const LEVELS = {
  beginner: 'to someone new to the field, with an everyday comparison',
  intermediate: 'to a working developer or student',
  expert: 'to a specialist, precisely and briefly',
};

function explainText(ref: string, id: string | undefined, level: keyof typeof LEVELS): string {
  const target = id
    ? `the Atlas term ${id}`
    : `the term "${ref}" (find it with search_terms first)`;
  return [
    `Explain ${target} ${LEVELS[level]}.`,
    `1. Call lookup_term for its names in English and Danish, summary, body facets and sources.`,
    `2. Call related_terms with edge_types ["requires"] and depth 2 for its prerequisites, and explain any the reader is unlikely to know first.`,
    `3. Use related_terms for what it is a kind of and what it contrasts with, to place it.`,
    `Give the Danish name alongside the English one, cite the sources, and end with the attribution line the tools return.`,
  ].join('\n');
}

const EXPLAIN = {
  title: 'Explain like Atlas',
  description: 'Explain a technical term at a chosen depth, building up from its prerequisites.',
  argsSchema: {
    term: z.string().describe('An Atlas id or a name in English or Danish'),
    level: z.enum(['beginner', 'intermediate', 'expert']).describe('How deep to go'),
  },
};

type ExplainArgs = { term: string; level: keyof typeof LEVELS };

const explain =
  (ctx: ToolContext) =>
  ({ term, level }: ExplainArgs) => {
    const text = explainText(term, ctx.atlas.resolve(term)?.term.id, level);
    return { messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }] };
  };

function registerExplainPrompt(server: McpServer, ctx: ToolContext): void {
  server.registerPrompt('explain-like-atlas', EXPLAIN, explain(ctx));
}

export function registerContext(server: McpServer, ctx: ToolContext): void {
  registerTermResource(server, ctx);
  registerExplainPrompt(server, ctx);
}
