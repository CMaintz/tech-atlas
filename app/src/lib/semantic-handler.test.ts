// The `semantic-search` Edge Function's handler (supabase/functions/semantic-search,
// A75), driven with a mocked fetch: every answer it gives on the wire.
import { describe, expect, it, vi } from 'vitest';
import {
  handleSearch,
  logPoolingOnce,
  type SearchDeps,
} from '../../../supabase/functions/semantic-search/handler';
import {
  DIM,
  MAX_BODY_BYTES,
  floodFilter,
} from '../../../supabase/functions/semantic-search/logic';

const SITE = 'https://atlas.maintz.dev';
const URL_ = 'https://ref.supabase.co/functions/v1/semantic-search';
const ENV: Record<string, string> = {
  CLOUDFLARE_ACCOUNT_ID: 'acc',
  CLOUDFLARE_API_TOKEN: 'cf-token',
  SUPABASE_URL: 'https://ref.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
};

const req = (body: unknown, init: RequestInit = {}) =>
  new Request(URL_, {
    method: 'POST',
    headers: { origin: SITE, 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.7' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...init,
  });

const embedding = () =>
  new Response(
    JSON.stringify({
      success: true,
      result: { data: [Array.from({ length: DIM }, (_, i) => (i === 0 ? 2 : 0))], pooling: 'cls' },
    }),
  );

type Upstream = { allow?: () => Response; embed?: () => Response; match?: () => Response };

/** Routes the three upstream calls; each defaults to a successful answer. */
function mockFetch(up: Upstream = {}) {
  return vi.fn(async (url: string, _init: RequestInit) => {
    if (url.endsWith('/rpc/search_allow')) return (up.allow ?? (() => new Response('true')))();
    if (url.endsWith('/rpc/match_terms'))
      return (up.match ?? (() => new Response('[{"id":"security/phishing","score":0.8}]')))();
    return (up.embed ?? embedding)();
  });
}

function deps(fetch: SearchDeps['fetch'], env = ENV) {
  const errors: unknown[] = [];
  const pooling: (string | undefined)[] = [];
  const d: SearchDeps = {
    fetch,
    env: (k) => env[k],
    now: () => 0,
    logError: (e) => errors.push(e),
    notePooling: (p) => pooling.push(p),
  };
  return { ...d, errors, pooling };
}

const valid = { q: 'who owns the data', lang: 'en', k: 3 };

describe('handleSearch answers', () => {
  it('200 with the hits, CORS and no-store', async () => {
    const fetch = mockFetch();
    const d = deps(fetch);
    const res = await handleSearch(req(valid), d);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{"hits":[{"id":"security/phishing","score":0.8}]}');
    expect(res.headers.get('access-control-allow-origin')).toBe(SITE);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-type')).toBe('application/json');
    expect(d.pooling).toEqual(['cls']);
    expect(d.errors).toEqual([]);
  });

  it('calls search_allow (service key, hashed IP), Workers AI, then match_terms (anon key)', async () => {
    const fetch = mockFetch();
    await handleSearch(req(valid), deps(fetch));
    const [allow, embed, match] = fetch.mock.calls;
    expect(allow[0]).toBe('https://ref.supabase.co/rest/v1/rpc/search_allow');
    expect((allow[1].headers as Record<string, string>).apikey).toBe('service-key');
    expect(JSON.parse(allow[1].body as string).client).toMatch(/^[0-9a-f]{24}$/);
    expect(embed[0]).toBe(
      'https://api.cloudflare.com/client/v4/accounts/acc/ai/run/@cf/baai/bge-m3',
    );
    expect((embed[1].headers as Record<string, string>).Authorization).toBe('Bearer cf-token');
    expect(match[0]).toBe('https://ref.supabase.co/rest/v1/rpc/match_terms');
    expect((match[1].headers as Record<string, string>).Authorization).toBe('Bearer anon-key');
    const args = JSON.parse(match[1].body as string);
    expect(args.match_count).toBe(3);
    expect(args.query_embedding.startsWith('[1,0,')).toBe(true);
  });

  it('204 preflight for the site, without CORS for other origins', async () => {
    const pre = (origin: string) =>
      handleSearch(
        new Request(URL_, { method: 'OPTIONS', headers: { origin } }),
        deps(mockFetch()),
      );
    const ok = await pre(SITE);
    expect(ok.status).toBe(204);
    expect(ok.headers.get('access-control-allow-methods')).toBe('POST, OPTIONS');
    expect(
      (await pre('https://evil.example')).headers.get('access-control-allow-origin'),
    ).toBeNull();
  });

  it('405 for other methods', async () => {
    const res = await handleSearch(new Request(URL_, { method: 'GET' }), deps(mockFetch()));
    expect(res.status).toBe(405);
    expect(await res.text()).toBe('{"error":"method not allowed"}');
  });

  it('429 (Retry-After 60) past the in-isolate flood filter', async () => {
    const d = { ...deps(mockFetch()), limiter: floodFilter() };
    const statuses: number[] = [];
    for (let i = 0; i < 30; i++) statuses.push((await handleSearch(req(valid), d)).status);
    expect(statuses.every((s) => s === 200)).toBe(true);
    const last = await handleSearch(req(valid), d);
    expect(last.status).toBe(429);
    expect(last.headers.get('retry-after')).toBe('60');
    expect(await last.text()).toBe('{"error":"too many requests"}');
  });

  it('413 over the body cap, 400 for bad JSON or a bad request', async () => {
    const fetch = mockFetch();
    const big = await handleSearch(req('x'.repeat(MAX_BODY_BYTES + 1)), deps(fetch));
    expect([big.status, await big.text()]).toEqual([413, '{"error":"request too large"}']);
    const bad = await handleSearch(req('{nope'), deps(fetch));
    expect([bad.status, await bad.text()]).toEqual([400, '{"error":"expected a JSON body"}']);
    const lang = await handleSearch(req({ q: 'x', lang: 'de' }), deps(fetch));
    expect([lang.status, await lang.text()]).toEqual([
      400,
      '{"error":"`lang` must be \\"en\\" or \\"da\\""}',
    ]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('503 when any secret is missing', async () => {
    const res = await handleSearch(
      req(valid),
      deps(mockFetch(), { ...ENV, SUPABASE_ANON_KEY: '' }),
    );
    expect([res.status, await res.text()]).toEqual([
      503,
      '{"error":"semantic search is not configured"}',
    ]);
  });

  it('429 (Retry-After 60) when search_allow says no, before embedding', async () => {
    const fetch = mockFetch({ allow: () => new Response('false') });
    const res = await handleSearch(req(valid), deps(fetch));
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('60');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'search_allow fails',
      { allow: () => new Response('x', { status: 500 }) },
      'search_allow: HTTP 500',
    ],
    [
      'Workers AI fails',
      { embed: () => new Response('{}', { status: 401 }) },
      'Workers AI: HTTP 401',
    ],
    [
      'match_terms fails',
      { match: () => new Response('boom', { status: 500 }) },
      'match_terms: HTTP 500 boom',
    ],
    [
      'match_terms answers junk',
      { match: () => new Response('{}') },
      'match_terms: expected an array',
    ],
  ])('502 when %s, logging the message', async (_, up: Upstream, logged) => {
    const d = deps(mockFetch(up));
    const res = await handleSearch(req(valid), d);
    expect([res.status, await res.text()]).toEqual([502, '{"error":"semantic search failed"}']);
    expect(d.errors).toEqual([logged]);
  });

  it('logs a thrown non-Error as the value itself', async () => {
    const d = deps(
      mockFetch({
        allow: () => {
          throw 'offline';
        },
      }),
    );
    expect((await handleSearch(req(valid), d)).status).toBe(502);
    expect(d.errors).toEqual(['offline']);
  });
});

describe('logPoolingOnce', () => {
  it('logs the first pooling only', () => {
    const log = vi.fn();
    const note = logPoolingOnce(log);
    note(undefined);
    note('cls');
    expect(log.mock.calls).toEqual([['Workers AI pooling: (not reported)']]);
  });
});
