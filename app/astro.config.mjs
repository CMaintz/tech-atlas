// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

// Static-first (ADR-0008), deployed to GitHub Pages under /tech-atlas/.
// Routing is manual: src/pages/[lang]/... covers /en and /da (ADR-0007).
export default defineConfig({
  site: 'https://cmaintz.github.io',
  base: '/tech-atlas',
  integrations: [preact()],
  vite: { plugins: [tailwindcss()] },
});
