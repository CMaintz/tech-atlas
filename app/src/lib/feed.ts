/**
 * RSS feed of new Terms. A Term's date is the commit that added its file — the
 * only honest date the repo has; no authored field. Pure: parsing `git log` output and
 * writing RSS 2.0 are unit-tested; running git lives in term-dates.ts.
 */
import type { Lang } from './lang';

const TERMS_DIR = 'src/content/terms/';

/**
 * Parse `git log --diff-filter=A --name-only --format=@%aI -- <terms dir>` (newest
 * first) into Term id → ISO date of the commit that first added it.
 */
export function parseAddLog(log: string): Map<string, string> {
  const added = new Map<string, string>();
  let date = '';
  for (const raw of log.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('@')) {
      date = line.slice(1);
      continue;
    }
    const at = line.indexOf(TERMS_DIR);
    if (at < 0 || !line.endsWith('.yaml') || !date) continue;
    // Newest first, so a later line is an older add: keep overwriting.
    added.set(line.slice(at + TERMS_DIR.length, -'.yaml'.length), date);
  }
  return added;
}

export type FeedItem = { title: string; link: string; description: string; date: string };
export type Feed = {
  title: string;
  description: string;
  link: string;
  self: string;
  language: string;
  items: FeedItem[];
};

const xml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const rssItem = (i: FeedItem) => `    <item>
      <title>${xml(i.title)}</title>
      <link>${xml(i.link)}</link>
      <guid isPermaLink="true">${xml(i.link)}</guid>
      <pubDate>${new Date(i.date).toUTCString()}</pubDate>
      <description>${xml(i.description)}</description>
    </item>`;

/** RSS 2.0 with an Atom self link. Dates in RFC 822, as RSS requires. */
export function toRss(feed: Feed): string {
  const items = feed.items.map(rssItem).join('\n');
  const latest = feed.items[0]?.date;
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(feed.title)}</title>
    <link>${xml(feed.link)}</link>
    <description>${xml(feed.description)}</description>
    <language>${feed.language}</language>
    <atom:link href="${xml(feed.self)}" rel="self" type="application/rss+xml"/>
${latest ? `    <lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>\n` : ''}${items}
  </channel>
</rss>
`;
}

/** The newest `limit` dated Terms, newest first; same-day ties by id for a stable feed. */
export function newest<T extends { id: string }>(
  terms: T[],
  added: Map<string, string>,
  limit: number,
): (T & { date: string })[] {
  return terms
    .filter((t) => added.has(t.id))
    .map((t) => ({ ...t, date: added.get(t.id)! }))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.id.localeCompare(b.id))
    .slice(0, limit);
}

/** How many Terms each language's feed carries. */
export const FEED_SIZE = 50;

export type FeedTerm = {
  id: string;
  data: { term: Record<Lang, string>; summary: Record<Lang, string> };
};
export type FeedOptions = { lang: Lang; root: string; title: string; description: string };

/** One language's feed of the newest Terms; `root` is the absolute site root ending in `/`. */
export function termFeed(terms: FeedTerm[], added: Map<string, string>, o: FeedOptions): Feed {
  const { lang, root } = o;
  const items = newest(terms, added, FEED_SIZE).map((t) => ({
    title: t.data.term[lang],
    link: `${root}${lang}/terms/${t.id}/`,
    description: t.data.summary[lang],
    date: t.date,
  }));
  return {
    title: o.title,
    description: o.description,
    link: `${root}${lang}/`,
    self: `${root}${lang}/feed.xml`,
    language: lang,
    items,
  };
}
