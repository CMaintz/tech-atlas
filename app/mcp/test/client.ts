import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { createWorker, type Env, type WorkerOptions } from '../src/worker-app';

type RateLimit = Env['MCP_LIMITER'];
import { FIXTURE } from './fixture';

export const ENDPOINT = 'https://mcp.atlas.test/mcp';

export function countingLimiter(max: number): RateLimit & { keys: string[] } {
  const counts = new Map<string, number>();
  const keys: string[] = [];
  return {
    keys,
    async limit({ key }) {
      keys.push(key);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return { success: (counts.get(key) ?? 0) <= max };
    },
  };
}

export const openEnv = (over: Partial<Env> = {}): Env => ({
  MCP_LIMITER: countingLimiter(Infinity),
  SEMANTIC_LIMITER: countingLimiter(Infinity),
  SEMANTIC_GLOBAL_LIMITER: countingLimiter(Infinity),
  SEMANTIC_SEARCH_URL: 'https://semantic.test/functions/v1/semantic-search',
  ...over,
});

type Harness = { env?: Env; ip?: string; options?: WorkerOptions };

export function workerFetch({ env = openEnv(), ip = '203.0.113.7', options }: Harness = {}) {
  const worker = createWorker(FIXTURE, options);
  return (url: string | URL, init?: RequestInit) => {
    const req = new Request(url, init);
    req.headers.set('cf-connecting-ip', ip);
    return worker.fetch(req, env);
  };
}

export async function connect(harness: Harness = {}): Promise<Client> {
  const client = new Client({ name: 'atlas-test', version: '0.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(ENDPOINT), {
    fetch: workerFetch(harness),
  });
  await client.connect(transport);
  return client;
}

export async function call(client: Client, name: string, args: Record<string, unknown>) {
  return (await client.callTool({ name, arguments: args })) as CallToolResult;
}

export async function ok(client: Client, name: string, args: Record<string, unknown>) {
  const result = await call(client, name, args);
  if (result.isError) throw new Error(`${name} failed: ${JSON.stringify(result.content)}`);
  return result.structuredContent as Record<string, unknown> & { attribution: string };
}
