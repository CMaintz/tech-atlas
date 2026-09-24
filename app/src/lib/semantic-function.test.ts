// The pure half of the `semantic-search` Edge Function (supabase/functions/semantic-search).
import { describe, expect, it } from 'vitest';
import {
  CLOUDFLARE_MODEL,
  DIM,
  MAX_K,
  MAX_QUERY_CHARS,
  RateLimiter,
  allowedOrigin,
  clientIp,
  cloudflareEmbed,
  corsHeaders,
  parseCloudflareEmbedding,
  parseMatches,
  parseSearchRequest,
  toVectorLiteral,
} from '../../../supabase/functions/semantic-search/logic';
import { MODEL } from './semantic';

describe('the function and the embed script share one model', () => {
  it('uses the model the term vectors were embedded with', () => {
    expect(CLOUDFLARE_MODEL).toBe(MODEL.cloudflare);
    expect(DIM).toBe(MODEL.dim);
  });
});

describe('parseSearchRequest', () => {
  it('accepts {q, lang, k} and trims q; k defaults to 8', () => {
    expect(parseSearchRequest({ q: '  hvem ejer data ', lang: 'da' })).toEqual({
      ok: true,
      value: { q: 'hvem ejer data', lang: 'da', k: 8 },
    });
    expect(parseSearchRequest({ q: 'x', lang: 'en', k: 3 })).toMatchObject({
      value: { k: 3 },
    });
  });
  it('rejects a missing, empty or over-long query', () => {
    for (const q of [undefined, '', '   ', 42, 'x'.repeat(MAX_QUERY_CHARS + 1)]) {
      expect(parseSearchRequest({ q, lang: 'en' }).ok).toBe(false);
    }
    expect(parseSearchRequest({ q: 'x'.repeat(MAX_QUERY_CHARS), lang: 'en' }).ok).toBe(true);
  });
  it('rejects an unknown language, a bad k, or a non-object body', () => {
    expect(parseSearchRequest({ q: 'x', lang: 'de' }).ok).toBe(false);
    for (const k of [0, MAX_K + 1, 2.5, '3']) {
      expect(parseSearchRequest({ q: 'x', lang: 'en', k }).ok).toBe(false);
    }
    expect(parseSearchRequest(null).ok).toBe(false);
    expect(parseSearchRequest('q').ok).toBe(false);
  });
});

describe('CORS', () => {
  it('allows the site and local dev servers only', () => {
    expect(allowedOrigin('https://cmaintz.github.io')).toBe(true);
    expect(allowedOrigin('http://localhost:4321')).toBe(true);
    expect(allowedOrigin('http://127.0.0.1:4321')).toBe(true);
    expect(allowedOrigin('http://localhost')).toBe(true);
    expect(allowedOrigin('https://evil.example')).toBe(false);
    expect(allowedOrigin('https://cmaintz.github.io.evil.example')).toBe(false);
    expect(allowedOrigin('http://localhost.evil.example')).toBe(false);
    expect(allowedOrigin(null)).toBe(false);
  });
  it('echoes an allowed origin and omits the header otherwise', () => {
    expect(corsHeaders('https://cmaintz.github.io')['Access-Control-Allow-Origin']).toBe(
      'https://cmaintz.github.io',
    );
    expect(corsHeaders('https://evil.example')).toEqual({ Vary: 'Origin' });
  });
});

describe('clientIp', () => {
  const h = (m: Record<string, string>) => ({ get: (k: string) => m[k] ?? null });
  it('takes the first X-Forwarded-For hop', () => {
    expect(clientIp(h({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4');
    expect(clientIp(h({ 'cf-connecting-ip': '5.6.7.8' }))).toBe('5.6.7.8');
    expect(clientIp(h({}))).toBe('unknown');
  });
});

describe('RateLimiter', () => {
  it('allows `limit` requests per key per window', () => {
    const rl = new RateLimiter(2, 1000);
    expect([rl.allow('a', 0), rl.allow('a', 10), rl.allow('a', 20)]).toEqual([true, true, false]);
    expect(rl.allow('b', 20)).toBe(true);
    expect(rl.allow('a', 1000)).toBe(true);
  });
});

describe('Workers AI embedding', () => {
  const vec = (x: number) => Array.from({ length: DIM }, (_, i) => (i === 0 ? x : 0));

  it('posts the texts and returns unit vectors', async () => {
    let url = '';
    let init: RequestInit | undefined;
    const out = await cloudflareEmbed(['a', 'b'], {
      accountId: 'acc',
      token: 'tok',
      fetch: async (u, i) => {
        url = u;
        init = i;
        const result = { shape: [2, DIM], data: [vec(3), vec(-2)], pooling: 'cls' };
        return new Response(JSON.stringify({ success: true, result }));
      },
    });
    expect(url).toBe('https://api.cloudflare.com/client/v4/accounts/acc/ai/run/@cf/baai/bge-m3');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(init!.body as string)).toEqual({ text: ['a', 'b'], truncate_inputs: true });
    expect(out.map((v) => v[0])).toEqual([1, -1]);
  });

  it('rejects errors, wrong shapes and a different pooling', async () => {
    const fail = async () => new Response('{}', { status: 401 });
    await expect(
      cloudflareEmbed(['a'], { accountId: 'a', token: 't', fetch: fail }),
    ).rejects.toThrow('401');
    expect(() => parseCloudflareEmbedding({ success: false }, 1)).toThrow();
    expect(() => parseCloudflareEmbedding({ result: { data: [[1, 2]] } }, 1)).toThrow();
    expect(() => parseCloudflareEmbedding({ result: { data: [vec(1)] } }, 2)).toThrow();
    expect(() =>
      parseCloudflareEmbedding({ result: { data: [vec(1)], pooling: 'mean' } }, 1),
    ).toThrow('pooling');
  });
});

describe('database rows', () => {
  it('formats a vector for pgvector and validates match_terms rows', () => {
    expect(toVectorLiteral([0.5, -1])).toBe('[0.5,-1]');
    expect(parseMatches([{ id: 'a', score: 0.5 }])).toEqual([{ id: 'a', score: 0.5 }]);
    expect(() => parseMatches({})).toThrow();
    expect(() => parseMatches([{ id: 1, score: 0.5 }])).toThrow();
  });
});
