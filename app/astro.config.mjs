// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://lexicon.example',
  // Route-based i18n (ADR-0007): every language gets its own indexable URL.
  redirects: { '/': '/en/' },
  i18n: {
    locales: ['en', 'da'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: true },
  },
  integrations: [preact()],
  vite: { plugins: [tailwindcss()] },
});
