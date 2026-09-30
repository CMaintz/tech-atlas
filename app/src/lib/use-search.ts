/**
 * The Search island's state: the index once loaded, and for a query its results
 * (lexical, fused with search by meaning for questions, A75) and the shortcut links
 * an intent or a shared name leads to.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { collisionsOf } from './collisions';
import { parseIntent } from './intent';
import {
  MAX,
  bestMatch,
  buildEngine,
  disambiguationLink,
  intentLink,
  rankLexical,
  type SearchDoc,
  type SearchIndex,
} from './search';
import { mergeHits } from './semantic';
import { useSemanticHits } from './use-semantic';

type Lang = 'en' | 'da';

/** search-index.json, loaded once; an unreachable index searches nothing. */
function useSearchIndex(indexUrl: string, lang: Lang): SearchIndex {
  const [docs, setDocs] = useState<SearchDoc[] | null>(null);
  useEffect(() => {
    fetch(indexUrl)
      .then((r) => r.json())
      .then(setDocs)
      .catch(() => setDocs([]));
  }, [indexUrl]);
  const engine = useMemo(() => (docs ? buildEngine(docs, lang) : null), [docs, lang]);
  const byId = useMemo(() => new Map((docs ?? []).map((d) => [d.id, d])), [docs]);
  const collisions = useMemo(() => collisionsOf((docs ?? []).map((d) => d.id)), [docs]);
  return { docs: docs ?? [], byId, engine, collisions };
}

export type SearchOptions = {
  lang: Lang;
  indexUrl: string;
  /** The `semantic-search` Edge Function, or '' when no backend is configured. */
  semanticUrl: string;
  /** Base URL of this language, e.g. /tech-atlas/en/ */
  langBase: string;
  /** Templates with {a} / {b} placeholders. */
  intentLabels: { compare: string; route: string; before: string };
  /** Shown when the query is a name several terms share; {name} and {n} placeholders. */
  disambiguationLabel: string;
};

export function useSearch(o: SearchOptions, query: string) {
  const index = useSearchIndex(o.indexUrl, o.lang);
  const q = query.trim();
  const intent = index.engine ? parseIntent(query) : null;
  const { natural, lexicalIds, nameIds } = rankLexical(index.engine, q, Boolean(intent));
  // Debounced and abortable; without a backend, or on failure, the lexical results stand.
  const semantic = useSemanticHits(o.semanticUrl, q, o.lang, natural);
  const results = mergeHits(lexicalIds, natural ? semantic : null, { names: nameIds, max: MAX });
  const resolve = (phrase: string) => bestMatch(index, phrase);
  const labels = { lang: o.lang, langBase: o.langBase, labels: o.intentLabels };
  return {
    q,
    ready: Boolean(index.engine),
    byId: index.byId,
    results,
    action: intent ? intentLink(intent, resolve, labels) : null,
    disambiguation: disambiguationLink(q, index.collisions, o.langBase, o.disambiguationLabel),
  };
}

export type SearchState = ReturnType<typeof useSearch>;
