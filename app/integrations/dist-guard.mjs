// @ts-check
/**
 * Build guard (A89): fails `astro build` — so the gate and every deploy — when the
 * output would ship a secret or a page the Content-Security-Policy doesn't cover.
 *
 * Secrets: the client may carry only the public Supabase URL, the anon/publishable key
 * and the function URL. Any Supabase secret key (`sb_secret_…`), personal access token
 * (`sbp_…`), private key block, a JWT whose role is not `anon` (the legacy
 * service_role key is a JWT), or the value of any CI secret present in the build
 * environment fails the build. Findings name the file and the kind, never the value.
 *
 * CSP: every HTML page must carry the policy meta before its first script, script-src
 * must not allow `'unsafe-inline'`/`'unsafe-eval'`, and every inline script must be one
 * of the policy's hashes (an `is:inline` script added later would otherwise just be
 * blocked in the browser, silently).
 */
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** Build-environment variables that hold real secrets (CI or local); never in dist. */
export const SECRET_ENV = [
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'CLOUDFLARE_API_TOKEN',
];

const TEXT = /\.(html|js|mjs|css|json|xml|txt|svg|webmanifest|map)$/;

const PATTERNS = [
  { kind: 'Supabase secret key', re: /\bsb_secret_[A-Za-z0-9_-]{16,}/ },
  { kind: 'Supabase access token', re: /\bsbp_[0-9a-f]{40}\b/ },
  { kind: 'private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

/** @param {string} part */
function decodeJwtPart(part) {
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Kinds of secret found in `text` (empty when clean).
 * @param {string} text
 * @param {string[]} [forbidden] values of secret environment variables
 * @returns {string[]}
 */
export function findSecrets(text, forbidden = []) {
  /** @type {string[]} */
  const found = [];
  for (const { kind, re } of PATTERNS) if (re.test(text)) found.push(kind);
  for (const m of text.matchAll(/eyJ[\w-]{8,}\.(eyJ[\w-]+)\.[\w-]+/g)) {
    const payload = decodeJwtPart(m[1]);
    if (!payload || payload.role !== 'anon') {
      found.push(`JWT with role ${JSON.stringify(payload?.role ?? null)}`);
    }
  }
  for (const value of forbidden)
    if (value.length >= 8 && text.includes(value)) found.push('a CI secret value');
  return [...new Set(found)];
}

/**
 * Whether a `<script>` with these attributes runs (not a data block such as ld+json).
 * @param {string} attrs
 */
function isCode(attrs) {
  const type = /\btype\s*=\s*"([^"]*)"/i.exec(attrs)?.[1]?.toLowerCase();
  return !type || type === 'module' || type === 'text/javascript';
}

/**
 * CSP problems of one HTML page (empty when fine).
 * @param {string} html
 * @returns {string[]}
 */
export function checkPage(html) {
  const meta = /<meta http-equiv="content-security-policy" content="([^"]*)"/i.exec(html);
  if (!meta) return ['no Content-Security-Policy meta'];
  const directives = meta[1].split(';').map((d) => d.trim().split(/\s+/));
  const scriptSrc = directives.find((d) => d[0] === 'script-src') ?? [];
  return [
    ...scriptBeforeMeta(html, meta.index),
    ...(scriptSrc.length ? [] : ['no script-src']),
    ...unsafeScriptSources(scriptSrc),
    ...unhashedInlineScripts(html, scriptSrc),
    ...inlineEventHandlers(html),
  ];
}

/**
 * A policy applies only to what follows it; data blocks (ld+json) aren't scripts.
 * @param {string} html
 * @param {number} metaAt
 */
function scriptBeforeMeta(html, metaAt) {
  const firstScript = [...html.matchAll(/<script\b([^>]*)>/gi)].find((m) => isCode(m[1]));
  return firstScript && (firstScript.index ?? 0) < metaAt ? ['a script precedes the CSP meta'] : [];
}

/** @param {string[]} scriptSrc */
function unsafeScriptSources(scriptSrc) {
  return ["'unsafe-inline'", "'unsafe-eval'", '*', 'data:', 'http:', 'https:']
    .filter((bad) => scriptSrc.includes(bad))
    .map((bad) => `script-src allows ${bad}`);
}

/**
 * Inline scripts whose hash script-src doesn't list (the browser would block them).
 * @param {string} html
 * @param {string[]} scriptSrc
 */
function unhashedInlineScripts(html, scriptSrc) {
  const problems = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!isCode(m[1]) || /\bsrc\s*=/.test(m[1])) continue;
    const hash = `'sha256-${createHash('sha256').update(m[2]).digest('base64')}'`;
    if (!scriptSrc.includes(hash))
      problems.push(`inline script not in script-src: ${m[2].slice(0, 60)}`);
  }
  return problems;
}

/** @param {string} html */
function inlineEventHandlers(html) {
  const outsideScripts = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  return /\son[a-z]+\s*=\s*["']/i.test(outsideScripts)
    ? ['inline event-handler attribute (blocked by the CSP)']
    : [];
}

/** @param {string} dir */
async function files(dir) {
  /** @type {string[]} */
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (e.isFile() && TEXT.test(e.name)) out.push(path.join(e.parentPath, e.name));
  }
  return out;
}

/**
 * Secret and CSP problems across the build output, and how many pages were checked.
 * @param {string} outDir
 * @param {string[]} forbidden
 */
async function scan(outDir, forbidden) {
  /** @type {string[]} */
  const problems = [];
  let pages = 0;
  for (const file of await files(outDir)) {
    const rel = path.relative(outDir, file).split(path.sep).join('/');
    const text = await readFile(file, 'utf8');
    for (const kind of findSecrets(text, forbidden)) problems.push(`${rel}: ${kind}`);
    if (rel.endsWith('.html')) {
      pages++;
      for (const p of checkPage(text)) problems.push(`${rel}: ${p}`);
    }
  }
  return { problems, pages };
}

/** @param {string[]} problems at least one */
function failure(problems) {
  const shown = problems.slice(0, 20).join('\n  ');
  return new Error(
    `dist-guard: ${problems.length} problem(s):\n  ${shown}${problems.length > 20 ? '\n  …' : ''}`,
  );
}

/** @returns {import('astro').AstroIntegration} */
export default function distGuard() {
  return {
    name: 'atlas-dist-guard',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const forbidden = SECRET_ENV.map((n) => process.env[n] ?? '').filter(Boolean);
        const { problems, pages } = await scan(fileURLToPath(dir), forbidden);
        if (problems.length) throw failure(problems);
        logger.info(`dist-guard: ${pages} pages under the CSP, no secrets in the output`);
      },
    },
  };
}
