import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { cspConfig, originOf } from '../../integrations/csp.mjs';
import { checkPage, findSecrets } from '../../integrations/dist-guard.mjs';
import { Source } from '../schema';

// Built at run time so the scanners don't flag this file itself.
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (role: string) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ role })}.c2ln`;

describe('CSP config (A89)', () => {
  it('allows only the configured Supabase origins to be fetched', () => {
    const c = cspConfig({
      PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
      PUBLIC_SEMANTIC_SEARCH_URL: 'https://abc.supabase.co/functions/v1/semantic-search',
    });
    expect(c.directives).toContain("connect-src 'self' https://abc.supabase.co");
    expect(c.directives).toContain("object-src 'none'");
    expect(cspConfig({}).directives).toContain("connect-src 'self'");
  });

  it('ignores values that are not http(s) URLs', () => {
    expect(originOf('javascript:alert(1)')).toBeNull();
    expect(originOf('not a url')).toBeNull();
    expect(originOf(undefined)).toBeNull();
  });
});

describe('dist guard: secrets', () => {
  it('passes the public anon key and flags any other role', () => {
    expect(findSecrets(`const k="${jwt('anon')}"`)).toEqual([]);
    expect(findSecrets(`const k="${jwt('service_role')}"`)).toEqual([
      'JWT with role "service_role"',
    ]);
  });

  it('flags Supabase secret keys, access tokens and private keys', () => {
    expect(findSecrets('sb_' + 'secret_' + 'x'.repeat(24))).toEqual(['Supabase secret key']);
    expect(findSecrets('sbp_' + 'a'.repeat(40))).toEqual(['Supabase access token']);
    expect(findSecrets('-----BEGIN ' + 'PRIVATE KEY-----')).toEqual(['private key']);
    // supabase-js checks key prefixes itself; the bare prefix is not a key.
    expect(findSecrets('e.startsWith(`sb_secret_`)')).toEqual([]);
  });

  it('flags the value of a secret from the build environment', () => {
    expect(findSecrets('token=hunter2hunter2', ['hunter2hunter2'])).toEqual(['a CI secret value']);
  });
});

describe('dist guard: pages', () => {
  const code = 'console.log(1)';
  const hash = `'sha256-${createHash('sha256').update(code).digest('base64')}'`;
  const page = (policy: string, body: string) =>
    `<html><head><meta http-equiv="content-security-policy" content="${policy}"></head><body>${body}</body></html>`;

  it('accepts hashed inline scripts, external scripts and data blocks', () => {
    const body = `<script>${code}</script><script type="module" src="/a.js"></script><script type="application/ld+json">{}</script>`;
    expect(checkPage(page(`script-src 'self' ${hash};`, body))).toEqual([]);
  });

  it('rejects a missing policy, unhashed scripts, unsafe-inline and inline handlers', () => {
    expect(checkPage('<html><head></head></html>')).toEqual(['no Content-Security-Policy meta']);
    expect(checkPage(page("script-src 'self';", `<script>${code}</script>`))[0]).toMatch(
      /inline script not in script-src/,
    );
    expect(checkPage(page("script-src 'self' 'unsafe-inline';", ''))).toEqual([
      "script-src allows 'unsafe-inline'",
    ]);
    expect(checkPage(page("script-src 'self';", '<button onclick="x()">x</button>'))).toEqual([
      'inline event-handler attribute (blocked by the CSP)',
    ]);
  });
});

describe('Source URLs', () => {
  it('accepts web links only', () => {
    expect(Source.safeParse({ title: 't', url: 'https://example.org/' }).success).toBe(true);
    expect(Source.safeParse({ title: 't', url: 'javascript:alert(1)' }).success).toBe(false);
    expect(Source.safeParse({ title: 't', url: 'data:text/html,x' }).success).toBe(false);
  });
});
