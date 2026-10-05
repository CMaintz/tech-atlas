/**
 * The home search's lexical side and its shortcuts: the MiniSearch index over names,
 * aliases and summaries, the ranking for a query (names only, and without function
 * words, when it reads as a question), and the links an intent or a shared name leads
 * to. Pure given the index; the Search island adds search by meaning.
 */
import MiniSearch from 'minisearch';
import { collisionForQuery } from './collisions';
import { exactName, type Intent } from './intent';
import { dropStopwords, looksNaturalLanguage } from './semantic';
import { pairSlugFromIds } from './slug';

type Lang = 'en' | 'da';
/** One entry of the search index (search-index.json). */
export type SearchDoc = {
  id: string;
  term: Record<Lang, string>;
  aka: Record<Lang, string[]>;
  summary: Record<Lang, string>;
  contrasts: string[];
};
export type SearchLink = { href: string; label: string };

/** Results shown at most. */
export const MAX = 8;
const NAME_FIELDS = ['en', 'da', 'akaEn', 'akaDa'];

/** Typo-tolerant, prefix-matching index over both languages' names and aliases, and `lang`'s summary. */
export function buildEngine(docs: SearchDoc[], lang: Lang): MiniSearch {
  const ms = new MiniSearch({
    fields: ['en', 'da', 'akaEn', 'akaDa', 'summary'],
    searchOptions: { boost: { en: 3, da: 3, akaEn: 2, akaDa: 2 }, fuzzy: 0.2, prefix: true },
  });
  ms.addAll(
    docs.map((d) => ({
      id: d.id,
      en: d.term.en,
      da: d.term.da,
      akaEn: d.aka.en.join(' '),
      akaDa: d.aka.da.join(' '),
      summary: d.summary[lang],
    })),
  );
  return ms;
}

/** The loaded index: its documents, by id, and the search engine (null while loading). */
export type SearchIndex = {
  docs: SearchDoc[];
  byId: Map<string, SearchDoc>;
  engine: MiniSearch | null;
  collisions: Map<string, string[]>;
};

/** The term a phrase names best: an exact name, else the top name/alias match. */
export function bestMatch(index: SearchIndex, phrase: string): SearchDoc | undefined {
  const exact = exactName(index.docs, phrase);
  if (exact) return exact;
  const hit = index.engine?.search(phrase, { fields: NAME_FIELDS })[0];
  return hit ? index.byId.get(hit.id as string) : undefined;
}

/**
 * The lexical ranking of `q`. A question or description (`natural`; never an intent)
 * drops function words, and its `nameIds` — names and aliases only — are the lexical
 * side in fusion: for a question, a word from the summaries ("stopping", "people") is
 * noise, while a named term ("MFA") is a strong signal.
 */
export function rankLexical(engine: MiniSearch | null, q: string, isIntent: boolean) {
  const plain = engine && q ? engine.search(q) : [];
  const natural = Boolean(engine) && !isIntent && looksNaturalLanguage(q, plain.length);
  const lexical = natural && engine ? engine.search(q, { processTerm: dropStopwords }) : plain;
  const ids = (hits: { id: unknown }[]) => hits.slice(0, MAX).map((r) => r.id as string);
  const nameIds =
    natural && engine
      ? ids(engine.search(q, { processTerm: dropStopwords, fields: NAME_FIELDS }))
      : [];
  return { natural, lexicalIds: ids(lexical), nameIds };
}

type IntentLabels = { compare: string; route: string; before: string };
type Resolve = (phrase: string) => SearchDoc | undefined;

/** Compare a contrasted pair on its compare page; any other pair gets the route between them. */
function pairLink(kind: Intent['kind'], a: SearchDoc, b: SearchDoc, langBase: string) {
  if (kind === 'compare' && a.contrasts.includes(b.id))
    return { href: `${langBase}compare/${pairSlugFromIds(a.id, b.id)}/`, key: 'compare' as const };
  const from = encodeURIComponent(a.id);
  return {
    href: `${langBase}explorer/?from=${from}&to=${encodeURIComponent(b.id)}`,
    key: 'route' as const,
  };
}

/** Where an intent leads, each phrase resolved to its best-matching term; null when it can't. */
export function intentLink(
  intent: Intent,
  resolve: Resolve,
  o: { lang: Lang; langBase: string; labels: IntentLabels },
): SearchLink | null {
  const a = resolve(intent.a);
  const b = intent.kind === 'before' ? undefined : resolve(intent.b);
  const fill = (t: string) =>
    t.replace('{a}', a?.term[o.lang] ?? '').replace('{b}', b?.term[o.lang] ?? '');
  if (intent.kind === 'before' && a)
    return { href: `${o.langBase}terms/${a.id}/#learn-first`, label: fill(o.labels.before) };
  if (!a || !b || a.id === b.id) return null;
  const { href, key } = pairLink(intent.kind, a, b, o.langBase);
  return { href, label: fill(o.labels[key]) };
}

/** A query that is exactly a name several terms share goes to its Disambiguation page (ADR-0003). */
export function disambiguationLink(
  q: string,
  collisions: Map<string, string[]>,
  langBase: string,
  template: string,
): SearchLink | null {
  const shared = collisionForQuery(q, collisions);
  if (!shared) return null;
  const label = template
    .replace('{name}', shared.replace(/-/g, ' '))
    .replace('{n}', String(collisions.get(shared)!.length));
  return { href: `${langBase}terms/${shared}/`, label };
}
