import type MiniSearch from 'minisearch';
import { buildEngine } from '../../src/lib/search';
import type { AtlasBundle, BundleTerm, Lang } from './bundle';
import { bareIndex, nameIndex, normName, type NameHit } from './names';
import { adjacency, type Adjacency } from './related';

type ResolveOptions = { lang?: Lang; only?: Lang };

type Resolved = { term: BundleTerm; alsoMatches: string[] };

export type Atlas = {
  bundle: AtlasBundle;
  byId: Map<string, BundleTerm>;
  graph: Adjacency;
  resolve(ref: string, opts?: ResolveOptions): Resolved | null;
  engine(lang: Lang): MiniSearch;
};

function byLang(hits: NameHit[], lang?: Lang): string[] {
  const score = (h: NameHit) => (lang && h.lang !== lang ? 1 : 0);
  return [...hits].sort((a, b) => score(a) - score(b)).map((h) => h.id);
}

const distinct = (ids: string[]) => [...new Set(ids)];

type Indexes = {
  byId: Map<string, BundleTerm>;
  names: Map<string, NameHit[]>;
  bare: Map<string, string[]>;
};

function candidates(ix: Indexes, ref: string, { lang, only }: ResolveOptions): string[] {
  const key = normName(ref);
  const hits = (ix.names.get(key) ?? []).filter((h) => !only || h.lang === only);
  const prefer = only ?? lang;
  const whole = byLang(
    hits.filter((h) => h.whole),
    prefer,
  );
  const split = byLang(
    hits.filter((h) => !h.whole),
    prefer,
  );
  const exact = ix.byId.has(key) ? [key] : [];
  const bare = ix.bare.get(key) ?? ix.bare.get(key.replace(/ /g, '-')) ?? [];
  return [...exact, ...whole, ...bare, ...split];
}

type Resolve = Atlas['resolve'];

function makeResolver(bundle: AtlasBundle, byId: Map<string, BundleTerm>): Resolve {
  const ix: Indexes = { byId, names: nameIndex(bundle.terms), bare: bareIndex(bundle.terms) };
  return (ref, options = {}) => {
    const [first, ...rest] = distinct(candidates(ix, ref, options));
    const term = first ? byId.get(first) : undefined;
    return term ? { term, alsoMatches: rest } : null;
  };
}

function engines(bundle: AtlasBundle): Atlas['engine'] {
  const built = { en: buildEngine(bundle.search, 'en'), da: buildEngine(bundle.search, 'da') };
  return (lang) => built[lang];
}

export function makeAtlas(bundle: AtlasBundle): Atlas {
  const byId = new Map(bundle.terms.map((t) => [t.id, t]));
  return {
    bundle,
    byId,
    graph: adjacency(bundle.links),
    resolve: makeResolver(bundle, byId),
    engine: engines(bundle),
  };
}
