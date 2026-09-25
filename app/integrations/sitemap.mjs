// @ts-check
/**
 * Sitemap (A68), written after the build from the pages actually emitted, so it can
 * never disagree with the routes. Every indexable HTML page is listed with its
 * `hreflang` alternates; pages that ask not to be indexed (redirects, the 404) are
 * left out, as is the review queue (a work list, not content).
 *
 * Output: sitemap-0.xml + sitemap-index.xml at the site root (under the base path),
 * the same file names @astrojs/sitemap uses, without the dependency.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const EXCLUDE = [/^(en|da)\/review\//, /^(en|da)\/account\//];

/** @param {string} dir */
async function htmlFiles(dir) {
  /** @type {string[]} */
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (e.isFile() && e.name.endsWith('.html')) out.push(path.join(e.parentPath, e.name));
  }
  return out;
}

/** @param {string} s */
const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** @returns {import('astro').AstroIntegration} */
export default function sitemap() {
  /** @type {string} */
  let root = '';
  return {
    name: 'atlas-sitemap',
    hooks: {
      'astro:config:done': ({ config }) => {
        if (!config.site) throw new Error('sitemap: `site` must be set');
        root = new URL(config.base.endsWith('/') ? config.base : `${config.base}/`, config.site)
          .href;
      },
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        /** @type {string[]} */
        const pages = [];
        for (const file of await htmlFiles(outDir)) {
          const rel = path.relative(outDir, file).split(path.sep).join('/');
          const route = rel === 'index.html' ? '' : rel.replace(/(^|\/)index\.html$/, '$1');
          if (rel === '404.html' || EXCLUDE.some((r) => r.test(route))) continue;
          const html = await readFile(file, 'utf8');
          if (/<meta name="robots" content="noindex"/.test(html)) continue;
          if (/<meta http-equiv="refresh"/.test(html)) continue;
          pages.push(route);
        }
        pages.sort();
        const set = new Set(pages);
        const urls = pages.map((p) => {
          const m = /^(en|da)\/(.*)$/.exec(p);
          const alts = m
            ? ['en', 'da']
                .filter((l) => set.has(`${l}/${m[2]}`))
                .map(
                  (l) =>
                    `    <xhtml:link rel="alternate" hreflang="${l}" href="${xml(root + l + '/' + m[2])}"/>`,
                )
            : [];
          return [`  <url>`, `    <loc>${xml(root + p)}</loc>`, ...alts, `  </url>`].join('\n');
        });
        await writeFile(
          path.join(outDir, 'sitemap-0.xml'),
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`,
        );
        await writeFile(
          path.join(outDir, 'sitemap-index.xml'),
          `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${xml(root)}sitemap-0.xml</loc></sitemap>\n</sitemapindex>\n`,
        );
        logger.info(`sitemap: ${pages.length} pages`);
      },
    },
  };
}
