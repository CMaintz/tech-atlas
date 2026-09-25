// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
import sitemap from './integrations/sitemap.mjs';
import distGuard from './integrations/dist-guard.mjs';
import { cspConfig } from './integrations/csp.mjs';

// The PUBLIC_* build variables (process env wins over app/.env), for the CSP's connect-src.
const env = loadEnv('production', fileURLToPath(new URL('.', import.meta.url)), 'PUBLIC_');

// Static-first (ADR-0008), deployed to GitHub Pages under /tech-atlas/.
// Routing is manual: src/pages/[lang]/... covers /en and /da (ADR-0007).
export default defineConfig({
  site: 'https://cmaintz.github.io',
  base: '/tech-atlas',
  integrations: [preact(), sitemap(), distGuard()],
  vite: { plugins: [tailwindcss()] },
  // Content-Security-Policy as a <meta> in every page (A89; integrations/csp.mjs).
  security: { csp: cspConfig(env) },
});
