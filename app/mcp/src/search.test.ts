import { describe, expect, it } from 'vitest';
import { call, connect, ok, openEnv } from '../test/client';

type Result = { id: string; score?: number };
const ids = (out: Record<string, unknown>) => (out.results as Result[]).map((r) => r.id);

describe('search_terms', () => {
  it('ranks name matches in either language', async () => {
    const client = await connect();
    expect(ids(await ok(client, 'search_terms', { query: 'kryptering' }))[0]).toBe(
      'security/encryption',
    );
  });

  it('keeps only the asked domain', async () => {
    const client = await connect();
    const out = await ok(client, 'search_terms', { query: 'model', domain: 'cs' });
    expect(ids(out)).toEqual(['cs/model']);
  });

  it('returns at most `limit` results', async () => {
    const client = await connect();
    const out = await ok(client, 'search_terms', { query: 'summary', limit: 2 });
    expect(ids(out)).toHaveLength(2);
  });
});

describe('semantic_search', () => {
  it('asks the semantic-search function in the right language and joins its hits to terms', async () => {
    const sent: unknown[] = [];
    const client = await connect({
      options: {
        fetch: async (_url, init) => {
          sent.push(JSON.parse(String(init?.body)));
          return Response.json({
            hits: [
              { id: 'security/encryption', score: 0.81 },
              { id: 'gone/removed-term', score: 0.7 },
            ],
          });
        },
      },
    });
    const out = await ok(client, 'semantic_search', {
      query: 'holde data hemmelige',
      lang: 'da',
      limit: 5,
    });
    expect(sent).toEqual([{ q: 'holde data hemmelige', lang: 'da', k: 5 }]);
    expect(out.results).toEqual([
      expect.objectContaining({ id: 'security/encryption', score: 0.81, name: expect.any(Object) }),
    ]);
  });

  it('turns an upstream failure into a tool error', async () => {
    const client = await connect({
      options: { fetch: async () => new Response('busy', { status: 429 }) },
    });
    const result = await call(client, 'semantic_search', { query: 'secret data' });
    expect(result.isError).toBe(true);
  });

  it('says it is unavailable when no function URL is configured', async () => {
    const client = await connect({ env: openEnv({ SEMANTIC_SEARCH_URL: '' }) });
    const result = await call(client, 'semantic_search', { query: 'secret data' });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toMatch(/not configured|search_terms/);
  });
});
