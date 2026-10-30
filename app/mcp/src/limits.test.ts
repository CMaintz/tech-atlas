import { describe, expect, it } from 'vitest';
import { call, connect, countingLimiter, ENDPOINT, ok, openEnv, workerFetch } from '../test/client';

const listTools = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
const post = (fetch: ReturnType<typeof workerFetch>) =>
  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: listTools,
  });

describe('rate limiting', () => {
  it('limits each client IP on its own', async () => {
    const env = openEnv({ MCP_LIMITER: countingLimiter(2) });
    const a = workerFetch({ env, ip: '198.51.100.1' });
    const b = workerFetch({ env, ip: '198.51.100.2' });
    expect((await post(a)).status).toBe(200);
    expect((await post(a)).status).toBe(200);
    expect((await post(a)).status).toBe(429);
    expect((await post(b)).status).toBe(200);
  });

  it('answers 429 with a Retry-After header', async () => {
    const env = openEnv({ MCP_LIMITER: countingLimiter(0) });
    const res = await post(workerFetch({ env }));
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('60');
  });

  it('gives semantic_search its own, tighter limit that leaves other tools working', async () => {
    const env = openEnv({ SEMANTIC_LIMITER: countingLimiter(0) });
    const client = await connect({
      env,
      options: { fetch: async () => Response.json({ hits: [] }) },
    });
    const limited = await call(client, 'semantic_search', { query: 'how do I keep data secret' });
    expect(limited.isError).toBe(true);
    expect(JSON.stringify(limited.content)).toMatch(/rate limit/i);
    await expect(ok(client, 'search_terms', { query: 'tls' })).resolves.toBeTruthy();
  });
});

describe('semantic budget', () => {
  it('caps semantic_search across all callers, since they share the upstream budget', async () => {
    const env = openEnv({ SEMANTIC_GLOBAL_LIMITER: countingLimiter(1) });
    const options = { fetch: async () => Response.json({ hits: [] }) };
    const first = await connect({ env, ip: '198.51.100.1', options });
    const second = await connect({ env, ip: '198.51.100.2', options });
    expect((await call(first, 'semantic_search', { query: 'secret data' })).isError).toBeFalsy();
    const limited = await call(second, 'semantic_search', { query: 'secret data' });
    expect(limited.isError).toBe(true);
  });
});

describe('batches', () => {
  it('refuses a JSON-RPC batch, which would buy many calls for one rate-limit token', async () => {
    const batch = JSON.stringify(
      [1, 2, 3].map((id) => ({ jsonrpc: '2.0', id, method: 'tools/list' })),
    );
    const res = await workerFetch()(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: batch,
    });
    expect(res.status).toBe(400);
  });
});

describe('caps', () => {
  it('refuses a search limit over the cap', async () => {
    const client = await connect();
    const result = await call(client, 'search_terms', { query: 'tls', limit: 500 });
    expect(result.isError).toBe(true);
  });

  it('refuses a semantic_search limit over the upstream maximum', async () => {
    const client = await connect({ options: { fetch: async () => Response.json({ hits: [] }) } });
    const result = await call(client, 'semantic_search', { query: 'secret data', limit: 21 });
    expect(result.isError).toBe(true);
  });
});

describe('routing', () => {
  it('serves MCP on /mcp under any host, so a custom domain and a zone route both work', async () => {
    const fetch = workerFetch();
    const init = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: listTools,
    };
    expect((await fetch('https://atlas.maintz.dev/mcp', init)).status).toBe(200);
    expect((await fetch('https://mcp.atlas.maintz.dev/mcp', init)).status).toBe(200);
    expect((await fetch('https://atlas.maintz.dev/en/terms/', init)).status).toBe(404);
  });

  it('refuses the standalone GET stream, which a stateless Worker would hold open for nothing', async () => {
    const res = await workerFetch()(ENDPOINT, { headers: { accept: 'text/event-stream' } });
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST, OPTIONS');
  });
});
