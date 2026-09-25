// @ts-check
/**
 * The site's Content-Security-Policy (A89). GitHub Pages cannot send headers, so Astro
 * writes the policy into every page as `<meta http-equiv="content-security-policy">`
 * (`security.csp`), hashing each inline script it emits (island loaders, directives).
 *
 * - script-src: `'self'` + Astro's hashes. No `'unsafe-inline'`, no `'unsafe-eval'`:
 *   injected markup cannot run script, and `javascript:` URLs are blocked.
 * - style-src: `'self' 'unsafe-inline'`. Cytoscape and 3d-force-graph inject `<style>`
 *   elements at run time and the graph legends use `style=""` attributes, none of which
 *   can be hashed ahead of time; with a hash present browsers would ignore
 *   `'unsafe-inline'`, so Astro is told to emit none (see its render/csp.js).
 * - connect-src: `'self'` + the Supabase project (auth, the learner_state table) and the
 *   semantic-search function — taken from the same PUBLIC_* build variables the client
 *   uses, so an unconfigured build allows no third-party origin at all.
 *
 * Not expressible in a meta policy (browsers ignore them there): `frame-ancestors`,
 * `report-uri`/`report-to`, `sandbox`. See docs/SECURITY.md.
 */

/**
 * The origin of a configured URL, or null when unset/invalid.
 * @param {string | undefined} value
 */
export function originOf(value) {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.origin : null;
  } catch {
    return null;
  }
}

/**
 * Astro `security.csp` settings for the given build environment.
 * @param {Record<string, string | undefined>} env
 */
export function cspConfig(env) {
  const origins = [
    ...new Set(
      [originOf(env.PUBLIC_SUPABASE_URL), originOf(env.PUBLIC_SEMANTIC_SEARCH_URL)].filter(
        (o) => o !== null,
      ),
    ),
  ];
  return {
    algorithm: /** @type {const} */ ('SHA-256'),
    directives: [
      "default-src 'self'",
      ['connect-src', "'self'", ...origins].join(' '),
      "img-src 'self' data:",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-src 'none'",
      "worker-src 'self'",
      "manifest-src 'self'",
    ],
    styleDirective: { resources: ["'self'", "'unsafe-inline'"] },
  };
}
