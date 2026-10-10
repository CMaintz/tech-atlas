import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ABOUT_LINKS, ABOUT_PEOPLE, ABOUT_UI, url, type Lang } from './site';
import { feedbackProps } from './feedback-props';
import { visibleLinks } from './about';
import { CHANGELOG_URL, VERSION } from './version';

const photoUrl = (photo: string) =>
  existsSync(resolve(process.cwd(), 'public', 'about', photo)) ? url(`about/${photo}`) : undefined;

const aboutPeople = (lang: Lang) =>
  ABOUT_PEOPLE.map((p) => ({
    section: p.section,
    name: p.name,
    role: p.role[lang],
    photo: photoUrl(p.photo),
    photoPosition: p.photoPosition ?? 'center',
  }));

export const aboutProps = (lang: Lang) => ({
  ui: { ...ABOUT_UI[lang] },
  links: visibleLinks([
    { id: 'github', label: 'GitHub', href: ABOUT_LINKS.github },
    { id: 'linkedin', label: 'LinkedIn', href: ABOUT_LINKS.linkedin },
    { id: 'website', label: 'maintz.dev', href: ABOUT_LINKS.website },
  ]),
  people: aboutPeople(lang),
  version: { label: VERSION, href: CHANGELOG_URL },
  feedback: feedbackProps(lang),
});

export type AboutProps = ReturnType<typeof aboutProps>;
