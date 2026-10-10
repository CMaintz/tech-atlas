import MiniSearch from 'minisearch';
import { collisionForQuery } from './collisions';
import { exactName, type Intent } from './intent';
import { dropStopwords, looksNaturalLanguage } from './semantic';
import { pairSlugFromIds } from './slug';

type Lang = 'en' | 'da';
export type SearchDoc = {
  id: string;
  term: Record<Lang, string>;
  aka: Record<Lang, string[]>;
  summary: Record<Lang, string>;
  contrasts: string[];
};
export type SearchLink = { href: string; label: string };

export const MAX = 8;
const NAME_FIELDS = ['en', 'da', 'akaEn', 'akaDa'];

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

export type SearchIndex = {
  docs: SearchDoc[];
  byId: Map<string, SearchDoc>;
  engine: MiniSearch | null;
  collisions: Map<string, string[]>;
};

export function bestMatch(index: SearchIndex, phrase: string): SearchDoc | undefined {
  const exact = exactName(index.docs, phrase);
  if (exact) return exact;
  const hit = index.engine?.search(phrase, { fields: NAME_FIELDS })[0];
  return hit ? index.byId.get(hit.id as string) : undefined;
}

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

type DocPair = { kind: Intent['kind']; a: SearchDoc; b: SearchDoc };

function pairLink({ kind, a, b }: DocPair, langBase: string) {
  if (kind === 'compare' && a.contrasts.includes(b.id))
    return { href: `${langBase}compare/${pairSlugFromIds(a.id, b.id)}/`, key: 'compare' as const };
  const from = encodeURIComponent(a.id);
  return {
    href: `${langBase}explorer/?from=${from}&to=${encodeURIComponent(b.id)}`,
    key: 'route' as const,
  };
}

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
  const { href, key } = pairLink({ kind: intent.kind, a, b }, o.langBase);
  return { href, label: fill(o.labels[key]) };
}

export function disambiguationLink(
  q: string,
  collisions: Map<string, string[]>,
  { langBase, template }: { langBase: string; template: string },
): SearchLink | null {
  const shared = collisionForQuery(q, collisions);
  if (!shared) return null;
  const ids = collisions.get(shared);
  if (!ids) throw new Error(`no collision named ${shared}`);
  const label = template
    .replace('{name}', shared.replace(/-/g, ' '))
    .replace('{n}', String(ids.length));
  return { href: `${langBase}terms/${shared}/`, label };
}
