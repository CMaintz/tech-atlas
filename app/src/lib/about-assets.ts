/**
 * Build-time props for the About dialog (A84). Server-only: it reads the file system,
 * so import it from .astro frontmatter, never from an island.
 *
 * A photo is passed to the island only if app/public/about/<photo> exists when the
 * site is built, so a missing photo is an initials circle, never a runtime 404.
 * Builds run from app/ (npm scripts, mise `dir = "app"`), so public/ is resolved there.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ABOUT_LINKS, ABOUT_PEOPLE, ABOUT_UI, url, type Lang } from './site';
import { visibleLinks } from './about';

export const aboutProps = (lang: Lang) => ({
  ui: { ...ABOUT_UI[lang] },
  links: visibleLinks([
    { id: 'github', label: 'GitHub', href: ABOUT_LINKS.github },
    { id: 'linkedin', label: 'LinkedIn', href: ABOUT_LINKS.linkedin },
  ]),
  people: ABOUT_PEOPLE.map((p) => ({
    section: p.section,
    name: p.name,
    role: p.role[lang],
    photo: existsSync(resolve(process.cwd(), 'public', 'about', p.photo))
      ? url(`about/${p.photo}`)
      : undefined,
    photoPosition: p.photoPosition ?? 'center',
  })),
});

export type AboutProps = ReturnType<typeof aboutProps>;
