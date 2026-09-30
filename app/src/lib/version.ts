/**
 * The site's version, read from app/package.json when the site is built.
 * release-please bumps that version in its Release PR, so the footer and the About
 * dialog always show the release that is deployed. Server-only (it reads the file
 * system): import it from .astro frontmatter or about-assets.ts, never from an island.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO } from './site';

// Builds run from app/ (npm scripts, mise `dir = "app"`), as in about-assets.ts.
const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  version: string;
};

/** e.g. "v2.0.0-beta.1". */
export const VERSION = `v${pkg.version}`;

/** Release notes. The CHANGELOG on main always exists, unlike a tag's page on release day. */
export const CHANGELOG_URL = `${REPO}/blob/main/CHANGELOG.md`;
