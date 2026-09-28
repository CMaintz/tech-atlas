// The `feedback` Edge Function's handler (supabase/functions/feedback, A100), driven
// with a mocked fetch.
import { describe, expect, it } from 'vitest';
import {
  FEEDBACK_TO,
  MAX_MESSAGE_CHARS,
  RESEND_URL,
  floodFilter,
  handleFeedback,
} from '../../../supabase/functions/feedback/logic';
import { ENV, SITE, deps, mockFetch, ok, req, valid } from './feedback-fixtures';

describe('handleFeedback', () => {
  it('stores the row, then emails the owner', async () => {
    const fetch = mockFetch(ok);
    const d = deps(fetch);
    const res = await handleFeedback(req(valid), d);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('access-control-allow-origin')).toBe(SITE);
    expect(fetch).toHaveBeenCalledTimes(2);

    const [rpcUrl, rpcInit] = fetch.mock.calls[0];
    expect(rpcUrl).toBe('https://ref.supabase.co/rest/v1/rpc/feedback_submit');
    expect((rpcInit.headers as Record<string, string>).Authorization).toBe('Bearer service-key');
    const row = JSON.parse(rpcInit.body as string);
    expect(row).toMatchObject({
      category: 'bug',
      message: valid.message,
      reply_email: valid.email,
      page: valid.page,
      lang: 'da',
    });
    expect(row.client).toMatch(/^[0-9a-f]{24}$/);
    expect(JSON.stringify(row)).not.toContain('192.0.2.7');

    const [mailUrl, mailInit] = fetch.mock.calls[1];
    expect(mailUrl).toBe(RESEND_URL);
    expect((mailInit.headers as Record<string, string>).Authorization).toBe('Bearer re_test');
    expect(JSON.parse(mailInit.body as string)).toMatchObject({
      reply_to: valid.email,
      to: [FEEDBACK_TO],
    });
    expect(d.logs).toEqual([]);
  });

  it('answers a filled honeypot with success and does nothing', async () => {
    const fetch = mockFetch(ok);
    const res = await handleFeedback(req({ ...valid, website: 'spam' }), deps(fetch));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('answers 429 when the database says the client is over its limit', async () => {
    const fetch = mockFetch(() => new Response(JSON.stringify('limited')));
    const res = await handleFeedback(req(valid), deps(fetch));
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('3600');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('still succeeds when Resend fails, and logs no content', async () => {
    const fetch = mockFetch(ok, () => new Response('{"message":"bad"}', { status: 500 }));
    const d = deps(fetch);
    const res = await handleFeedback(req(valid), d);
    expect(res.status).toBe(200);
    expect(d.logs).toEqual(['resend: HTTP 500 (row stored)']);
  });

  it('still succeeds when Resend is unreachable', async () => {
    const fetch = mockFetch(ok, () => {
      throw new TypeError(`network error for ${valid.email}`);
    });
    const d = deps(fetch);
    expect((await handleFeedback(req(valid), d)).status).toBe(200);
    expect(d.logs.join()).not.toContain(valid.email);
  });

  it('skips the email without RESEND_API_KEY, row still stored', async () => {
    const fetch = mockFetch(ok);
    const d = deps(fetch, { ...ENV, RESEND_API_KEY: '' });
    expect((await handleFeedback(req(valid), d)).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(d.logs[0]).toContain('RESEND_API_KEY not set');
  });

  it('fails with 502 when the row cannot be stored, and sends no email', async () => {
    const fetch = mockFetch(() => new Response('boom', { status: 500 }));
    const d = deps(fetch);
    const res = await handleFeedback(req(valid), d);
    expect(res.status).toBe(502);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(d.logs).toEqual(['feedback_submit: HTTP 500']);
  });

  it('never logs the message or email', async () => {
    const fetch = mockFetch(() => {
      throw new Error(`${valid.message} ${valid.email}`);
    });
    const d = deps(fetch);
    await handleFeedback(req(valid), d);
    expect(d.logs.join()).not.toContain(valid.email);
    expect(d.logs.join()).not.toContain('quiz');
  });

  it('answers 503 when the platform secrets are missing', async () => {
    const res = await handleFeedback(req(valid), deps(mockFetch(ok), {}));
    expect(res.status).toBe(503);
  });

  it('rejects bad input with 400 and a body over the cap with 413', async () => {
    const fetch = mockFetch(ok);
    expect((await handleFeedback(req({ ...valid, category: 'x' }), deps(fetch))).status).toBe(400);
    expect((await handleFeedback(req('{not json'), deps(fetch))).status).toBe(400);
    expect((await handleFeedback(req('x'.repeat(20_000)), deps(fetch))).status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('accepts a maximal message of multi-byte characters', async () => {
    const fetch = mockFetch(ok);
    const res = await handleFeedback(
      req({ ...valid, message: 'æ'.repeat(MAX_MESSAGE_CHARS) }),
      deps(fetch),
    );
    expect(res.status).toBe(200);
  });

  it('answers preflight with CORS for the site and localhost only', async () => {
    const pre = (origin: string) =>
      handleFeedback(
        new Request('https://ref.supabase.co/functions/v1/feedback', {
          method: 'OPTIONS',
          headers: { origin },
        }),
        deps(mockFetch(ok)),
      );
    expect((await pre(SITE)).headers.get('access-control-allow-origin')).toBe(SITE);
    expect((await pre('http://localhost:4321')).status).toBe(204);
    expect(
      (await pre('https://evil.example')).headers.get('access-control-allow-origin'),
    ).toBeNull();
  });

  it('refuses other methods and floods', async () => {
    const d = deps(mockFetch(ok));
    const get = new Request('https://ref.supabase.co/functions/v1/feedback', { method: 'GET' });
    expect((await handleFeedback(get, d)).status).toBe(405);
    const limiter = floodFilter();
    const statuses = [];
    for (let i = 0; i < 11; i++)
      statuses.push((await handleFeedback(req(valid), { ...d, limiter })).status);
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});
