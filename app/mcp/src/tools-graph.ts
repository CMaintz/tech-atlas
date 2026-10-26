import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { QUESTION_KINDS } from '../../src/schema';
import type { ClientQuestion } from '../../src/lib/question-rules';
import type { Lang } from './bundle';
import type { ToolContext } from './context';
import { neighbours, RELATIONS } from './related';
import { ATTRIBUTED, fail, langSchema, READ_ONLY, reply, withLicence } from './reply';
import { notFound, termArg } from './tools-terms';

const MAX_DEPTH = 2;
const MAX_NEIGHBOURS = 100;

const RELATED = {
  title: 'Related Atlas terms',
  description: withLicence(
    'The typed relations around an Atlas term (requires, kind-of, part-of, mitigates, ...), both directions: an edge pointing at the term is reported by its inverse name (unlocks, has-kind, has-part, mitigated-by, ...) with direction "in".',
  ),
  inputSchema: {
    term: termArg,
    edge_types: z.array(z.enum(RELATIONS)).optional().describe('Keep only these relations'),
    depth: z.number().int().min(1).max(MAX_DEPTH).optional().describe('Hops, 1 (default) or 2'),
  },
  outputSchema: {
    term: z.object({ id: z.string(), name: z.object({ en: z.string(), da: z.string() }) }),
    neighbours: z.array(
      z.object({
        id: z.string(),
        name: z.object({ en: z.string(), da: z.string() }),
        relation: z.string().describe('Read as: <via> <relation> <id>'),
        type: z.string().describe('The authored edge type'),
        direction: z.enum(['out', 'in']),
        hop: z.number(),
        via: z.string(),
      }),
    ),
    truncated: z.boolean(),
    ...ATTRIBUTED,
  },
  annotations: READ_ONLY,
};

type RelatedArgs = { term: string; edge_types?: string[]; depth?: number };

const related =
  (ctx: ToolContext) =>
  async ({ term, edge_types, depth = 1 }: RelatedArgs) => {
    const found = ctx.atlas.resolve(term);
    if (!found) return notFound(ctx, term);
    const { id, term: name } = found.term;
    const walk = { depth, relations: edge_types, max: MAX_NEIGHBOURS + 1 };
    const all = neighbours(ctx.atlas.graph, id, walk).map(({ other, ...step }) => ({
      id: other,
      name: ctx.atlas.byId.get(other)?.term ?? { en: other, da: other },
      ...step,
    }));
    const truncated = all.length > MAX_NEIGHBOURS;
    return reply({ term: { id, name }, neighbours: all.slice(0, MAX_NEIGHBOURS), truncated });
  };

const QUIZ = {
  title: 'Atlas quiz question',
  description: withLicence(
    'One multiple-choice question from the Atlas question bank. The answer is in a separate field: hide it until the learner has answered.',
  ),
  inputSchema: {
    domain: z.enum(['security', 'cs', 'ai', 'platform']).optional(),
    kind: z.enum(QUESTION_KINDS).optional(),
    lang: langSchema.optional().describe('Default en'),
  },
  outputSchema: {
    question: z.object({
      id: z.string(),
      kind: z.string(),
      stem: z.string(),
      options: z.array(z.string()),
      terms: z.array(z.string()),
      difficulty: z.number(),
    }),
    answer: z.object({ index: z.number(), option: z.string(), explanation: z.string() }),
    ...ATTRIBUTED,
  },
  annotations: READ_ONLY,
};

type QuizArgs = { domain?: string; kind?: string; lang?: Lang };

function testsDomain(ctx: ToolContext, q: ClientQuestion, domain: string): boolean {
  return q.terms.some((id) => ctx.atlas.byId.get(id)?.domain.includes(domain));
}

function candidates(ctx: ToolContext, { domain, kind, lang = 'en' }: QuizArgs) {
  return ctx.atlas.bundle.questions[lang].filter(
    (q) => (!kind || q.kind === kind) && (!domain || testsDomain(ctx, q, domain)),
  );
}

const quiz = (ctx: ToolContext) => async (args: QuizArgs) => {
  const pool = candidates(ctx, args);
  if (!pool.length) return fail('No Atlas question matches that domain and kind.');
  const q = pool[Math.floor(ctx.random() * pool.length)];
  const { id, kind, stem, options, terms, difficulty } = q;
  const answer = { index: q.answer, option: options[q.answer], explanation: q.explanation };
  return reply({ question: { id, kind, stem, options, terms, difficulty }, answer });
};

export function registerGraphTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool('related_terms', RELATED, related(ctx));
  server.registerTool('quiz_question', QUIZ, quiz(ctx));
}
