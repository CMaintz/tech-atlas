import { describe, expect, it } from 'vitest';
import { newest, parseAddLog, toRss } from './feed';

const LOG = `@2026-09-23T14:51:44+02:00

app/src/content/terms/security/csrf-token.yaml
@2026-09-22T10:00:00+02:00

app/src/content/terms/cs/json.yaml
app/src/content/terms/cs/README.md
app/src/content/articles/cs/json.en.md
@2026-09-20T09:00:00+02:00

app/src/content/terms/security/csrf-token.yaml
`;

describe('parseAddLog', () => {
  it('maps each term file to the commit date that added it, keeping the oldest add', () => {
    const m = parseAddLog(LOG);
    expect([...m.entries()]).toEqual([
      ['security/csrf-token', '2026-09-20T09:00:00+02:00'],
      ['cs/json', '2026-09-22T10:00:00+02:00'],
    ]);
  });

  it('is empty for empty output', () => {
    expect(parseAddLog('').size).toBe(0);
  });
});

describe('newest', () => {
  it('drops undated terms, sorts newest first with id as the tie-break, and limits', () => {
    const added = new Map([
      ['a', '2026-01-01T00:00:00Z'],
      ['b', '2026-02-01T00:00:00Z'],
      ['c', '2026-02-01T00:00:00Z'],
    ]);
    const out = newest([{ id: 'c' }, { id: 'a' }, { id: 'b' }, { id: 'x' }], added, 2);
    expect(out.map((t) => t.id)).toEqual(['b', 'c']);
    expect(out[0].date).toBe('2026-02-01T00:00:00Z');
  });
});

describe('toRss', () => {
  const rss = toRss({
    title: 'Atlas: new terms',
    description: 'd',
    link: 'https://x.test/tech-atlas/en/',
    self: 'https://x.test/tech-atlas/en/feed.xml',
    language: 'en',
    items: [
      {
        title: 'Cross-site <request> forgery & co',
        link: 'https://x.test/tech-atlas/en/terms/security/csrf/',
        description: 'A "forged" request',
        date: '2026-09-23T14:51:44+02:00',
      },
    ],
  });

  it('escapes text and writes RFC 822 dates', () => {
    expect(rss).toContain('<title>Cross-site &lt;request&gt; forgery &amp; co</title>');
    expect(rss).toContain('<description>A &quot;forged&quot; request</description>');
    expect(rss).toContain('<pubDate>Wed, 23 Sep 2026 12:51:44 GMT</pubDate>');
    expect(rss).toContain('<lastBuildDate>Wed, 23 Sep 2026 12:51:44 GMT</lastBuildDate>');
  });

  it('carries an Atom self link and a permalink guid', () => {
    expect(rss).toContain(
      '<atom:link href="https://x.test/tech-atlas/en/feed.xml" rel="self" type="application/rss+xml"/>',
    );
    expect(rss).toContain(
      '<guid isPermaLink="true">https://x.test/tech-atlas/en/terms/security/csrf/</guid>',
    );
  });

  it('omits lastBuildDate when there are no items', () => {
    const empty = toRss({
      title: 't',
      description: 'd',
      link: 'l',
      self: 's',
      language: 'da',
      items: [],
    });
    expect(empty).not.toContain('lastBuildDate');
    expect(empty).toContain('<language>da</language>');
  });
});
