// Shared setup for the `feedback` Edge Function tests: a valid body, a request, and a
// handler Deps with a mocked fetch and captured logs.
import { vi } from 'vitest';
import type { Deps } from '../../../supabase/functions/feedback/logic';

export const SITE = 'https://atlas.maintz.dev';
export const ENV: Record<string, string> = {
  SUPABASE_URL: 'https://ref.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  RESEND_API_KEY: 're_test',
};
export const valid = {
  category: 'bug',
  message: 'The quiz button does nothing on the Danish page',
  email: 'reader@example.com',
  page: '/tech-atlas/da/study/',
  lang: 'da',
  website: '',
};

export const req = (body: unknown, init: RequestInit = {}) =>
  new Request('https://ref.supabase.co/functions/v1/feedback', {
    method: 'POST',
    headers: { origin: SITE, 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.7' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...init,
  });

/** A fetch that answers the RPC with `rpc` and Resend with `resend`, recording calls. */
export function mockFetch(rpc: () => Response, resend: () => Response = () => new Response('{}')) {
  return vi.fn(async (url: string, _init: RequestInit) =>
    url.endsWith('/rest/v1/rpc/feedback_submit') ? rpc() : resend(),
  );
}

export function deps(fetch: Deps['fetch'], env = ENV): Deps & { logs: string[] } {
  const logs: string[] = [];
  return {
    fetch,
    env: (k) => env[k],
    now: () => Date.UTC(2026, 8, 28, 12),
    log: (m) => logs.push(m),
    logs,
  };
}

export const ok = () => new Response(JSON.stringify('ok'));
