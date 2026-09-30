// The plumbing both Edge Functions share (supabase/functions/_shared). CORS, clientIp,
// ipKey and readCapped are also covered through their re-exports in
// semantic-function.test.ts.
import { describe, expect, it, vi } from 'vitest';
import { readJsonBody } from '../../../supabase/functions/_shared/body';
import { admitJsonPost } from '../../../supabase/functions/_shared/intake';
import { LANG_ERROR, isLang, langError } from '../../../supabase/functions/_shared/lang';
import { requireEnv, rpcTarget, supabaseRpc } from '../../../supabase/functions/_shared/platform';
import { RateLimiter } from '../../../supabase/functions/_shared/rate-limit';
import { replyTo } from '../../../supabase/functions/_shared/reply';

const SITE = 'https://cmaintz.github.io';
const post = (body: string | null, headers: Record<string, string> = {}) =>
  new Request('https://ref.supabase.co/functions/v1/x', {
    method: 'POST',
    headers: { origin: SITE, 'cf-connecting-ip': '192.0.2.7', ...headers },
    body,
  });
const stream = (text: string) => new Response(text).body;

describe('replyTo', () => {
  it('answers JSON with CORS first, then extras, then the fixed headers', async () => {
    const res = replyTo(post(null)).json({ ok: true }, 200, { 'Retry-After': '5' });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{"ok":true}');
    expect([...res.headers.keys()]).toEqual([
      'access-control-allow-headers',
      'access-control-allow-methods',
      'access-control-allow-origin',
      'access-control-max-age',
      'cache-control',
      'content-type',
      'retry-after',
      'vary',
      'x-content-type-options',
    ]);
  });

  it('builds the 429 and the 204 preflight', async () => {
    const reply = replyTo(post(null, { origin: 'https://evil.example' }));
    const limited = reply.tooMany('3600');
    expect([limited.status, limited.headers.get('retry-after'), await limited.text()]).toEqual([
      429,
      '3600',
      '{"error":"too many requests"}',
    ]);
    const pre = reply.preflight();
    expect([pre.status, [...pre.headers.entries()]]).toEqual([204, [['vary', 'Origin']]]);
  });
});

describe('readJsonBody', () => {
  it('parses a body within the cap', async () => {
    expect(await readJsonBody(stream('{"a":1}'), 16)).toEqual({ ok: true, value: { a: 1 } });
  });

  it('answers 413 over the cap and 400 for anything that is not JSON', async () => {
    expect(await readJsonBody(stream('x'.repeat(17)), 16)).toEqual({
      ok: false,
      status: 413,
      error: 'request too large',
    });
    for (const text of ['{nope', ''])
      expect(await readJsonBody(stream(text), 16)).toEqual({
        ok: false,
        status: 400,
        error: 'expected a JSON body',
      });
    expect((await readJsonBody(null, 16)).ok).toBe(false);
  });
});

describe('admitJsonPost', () => {
  const opts = { maxBytes: 64, now: () => 0 };

  it('admits a JSON POST with the caller IP', async () => {
    const req = post('{"q":"x"}');
    expect(await admitJsonPost(req, replyTo(req), opts)).toEqual({
      ip: '192.0.2.7',
      body: { q: 'x' },
    });
  });

  it('turns away preflight, other methods, floods, big and bad bodies, in that order', async () => {
    const status = async (req: Request, o: Parameters<typeof admitJsonPost>[2] = opts) => {
      const out = await admitJsonPost(req, replyTo(req), o);
      return out instanceof Response ? out.status : 'admitted';
    };
    const url = 'https://ref.supabase.co/functions/v1/x';
    expect(await status(new Request(url, { method: 'OPTIONS' }))).toBe(204);
    expect(await status(new Request(url, { method: 'GET' }))).toBe(405);
    const limiter = new RateLimiter(1, 1000);
    expect(await status(post('{}'), { ...opts, limiter })).toBe('admitted');
    expect(await status(post('x'.repeat(100)), { ...opts, limiter })).toBe(429);
    expect(await status(post('x'.repeat(100)))).toBe(413);
    expect(await status(post('{bad'))).toBe(400);
  });
});

describe('RateLimiter', () => {
  it('forgets expired windows once it tracks more than 10,000 keys', () => {
    const rl = new RateLimiter(1, 1000);
    for (let i = 0; i <= 10_000; i++) rl.allow(`k${i}`, 0);
    expect(rl.allow('k0', 500)).toBe(false);
    expect(rl.allow('fresh', 1000)).toBe(true);
    expect(rl.allow('k0', 1000)).toBe(true);
  });
});

describe('requireEnv', () => {
  it('returns every named value, or null when one is unset or empty', () => {
    const env = (m: Record<string, string>) => (k: string) => m[k];
    expect(requireEnv(env({ A: '1', B: '2' }), ['A', 'B'])).toEqual({ A: '1', B: '2' });
    expect(requireEnv(env({ A: '1' }), ['A', 'B'])).toBeNull();
    expect(requireEnv(env({ A: '1', B: '' }), ['A', 'B'])).toBeNull();
  });
});

describe('supabaseRpc', () => {
  it('posts the arguments to /rest/v1/rpc/<fn> with the key as apikey and bearer', async () => {
    const fetch = vi.fn(async (_url: string, _init: RequestInit) => new Response('true'));
    const db = rpcTarget(fetch, 'https://ref.supabase.co', 1000);
    await supabaseRpc(db, 'search_allow', 'key', { client: 'abc' });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://ref.supabase.co/rest/v1/rpc/search_allow');
    expect(init).toMatchObject({
      method: 'POST',
      headers: { apikey: 'key', Authorization: 'Bearer key', 'Content-Type': 'application/json' },
      body: '{"client":"abc"}',
    });
    expect(init.signal).toBe(db.signal);
    expect(db.signal.aborted).toBe(false);
  });
});

describe('lang', () => {
  it('accepts en and da only', () => {
    expect([isLang('en'), isLang('da'), isLang('de'), isLang(undefined)]).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(langError('da')).toBeNull();
    expect(langError('EN')).toBe(LANG_ERROR);
  });
});
