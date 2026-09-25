import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { newest, toRss } from '../../lib/feed';
import { siteRoot } from '../../lib/export-data';
import { LANGS, type Lang } from '../../lib/site';
import { termAddedDates } from '../../lib/term-dates';
import { UI_EXTRA } from '../../lib/ui-extra';

/** RSS of the 50 newest Terms per language (A71): /en/feed.xml, /da/feed.xml. */
export const getStaticPaths = (() =>
  LANGS.map((lang) => ({ params: { lang } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params, site }) => {
  const lang = params.lang as Lang;
  const x = UI_EXTRA[lang];
  const root = siteRoot(site);
  const terms = (await getCollection('terms')).map((t) => ({ id: t.id, data: t.data }));
  const items = newest(terms, termAddedDates(), 50).map((t) => ({
    title: t.data.term[lang],
    link: `${root}${lang}/terms/${t.id}/`,
    description: t.data.summary[lang],
    date: t.date,
  }));
  return new Response(
    toRss({
      title: x.feedTitle,
      description: x.feedDescription,
      link: `${root}${lang}/`,
      self: `${root}${lang}/feed.xml`,
      language: lang,
      items,
    }),
    { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } },
  );
};
