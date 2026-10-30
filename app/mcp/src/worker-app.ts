import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { makeAtlas, type Atlas } from './atlas';
import type { AtlasBundle } from './bundle';
import type { Env, ToolContext } from './context';
import { createServer } from './server';

export type { Env } from './context';
export type WorkerOptions = { fetch?: typeof fetch; random?: () => number };

const ENDPOINT = /^\/mcp\/?$/;

// Public, read-only and cookie-free, so any origin may call it; browser-based MCP clients
// (the Inspector) need this.
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers':
    'content-type, accept, mcp-protocol-version, mcp-session-id, last-event-id',
  'access-control-expose-headers': 'mcp-session-id, mcp-protocol-version',
};

const INFO =
  'Atlas MCP server (Streamable HTTP). Add https://mcp.atlas.maintz.dev/mcp to your MCP client. Content: https://atlas.maintz.dev/ (CC BY-SA 4.0).';

function withCors(res: Response): Response {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
  return out;
}

// Stateless: a fresh server and transport per request, answered as plain JSON rather than
// an SSE stream, so nothing has to live between requests in the isolate.
async function serveMcp(req: Request, ctx: ToolContext): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await createServer(ctx).connect(transport);
  return transport.handleRequest(req);
}

const TOO_MANY = () =>
  new Response('Rate limit reached; try again in a minute.', {
    status: 429,
    headers: { 'retry-after': '60' },
  });

const NO_BATCHES = () =>
  Response.json(
    { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Batches are not supported.' } },
    { status: 400 },
  );

// A JSON-RPC batch would let one POST make many tool calls for a single rate-limit token.
// Protocol 2025-06-18 dropped batching anyway.
async function isBatch(req: Request): Promise<boolean> {
  return (await req.clone().text()).trimStart().startsWith('[');
}

async function serveEndpoint(req: Request, env: Env, base: Omit<ToolContext, 'env' | 'ip'>) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  // There is nothing to push, and a GET would otherwise hold an SSE stream open per client.
  if (req.method !== 'POST')
    return new Response('Method not allowed', { status: 405, headers: { allow: 'POST, OPTIONS' } });
  const ip = req.headers.get('cf-connecting-ip') ?? 'unknown';
  if (!(await env.MCP_LIMITER.limit({ key: ip })).success) return TOO_MANY();
  if (await isBatch(req)) return NO_BATCHES();
  return serveMcp(req, { ...base, env, ip });
}

function route(req: Request, env: Env, base: Omit<ToolContext, 'env' | 'ip'>) {
  const { pathname } = new URL(req.url);
  if (req.method === 'GET' && pathname === '/') return new Response(INFO);
  if (!ENDPOINT.test(pathname)) return new Response('Not found', { status: 404 });
  return serveEndpoint(req, env, base);
}

export function createWorker(bundle: AtlasBundle, options: WorkerOptions = {}) {
  // Built once per isolate: indexing is too costly for a request's CPU budget, while
  // startup has a 1 s allowance.
  const atlas: Atlas = makeAtlas(bundle);
  const base = {
    atlas,
    fetch: options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init)),
    random: options.random ?? Math.random,
  };
  return { fetch: async (req: Request, env: Env) => withCors(await route(req, env, base)) };
}
