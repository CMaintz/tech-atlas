/**
 * "Find a term" works like the home search: names and aliases at once, then, for
 * a question or description, the terms nearest in meaning, fused by RRF.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Graph, GraphNode } from './graph-model';
import { searchTerms } from './canvas-explorer';
import { looksNaturalLanguage, mergeHits } from './semantic';
import { useSemanticHits } from './use-semantic';

/** The query and its fused matches (names first, then meaning for natural language). */
export function useTermSearch(
  graph: Graph | null,
  byId: ReadonlyMap<string, GraphNode>,
  lang: 'en' | 'da',
  semanticUrl = '',
) {
  const [query, setQuery] = useState('');
  const q = query.trim();
  const named = useMemo(
    () => (graph ? searchTerms(graph.nodes, q, lang).map((n) => n.id) : []),
    [graph, q, lang],
  );
  const natural = !!graph && looksNaturalLanguage(q, named.length);
  const meaning = useSemanticHits(semanticUrl, q, lang, natural);
  const matches = mergeHits(named, natural ? meaning : null, { known: (id) => byId.has(id) });
  return { query, setQuery, matches };
}
export type TermSearch = ReturnType<typeof useTermSearch>;

/** Whether a compact bar's search field is opened (it is focused as it opens). */
export function useFindField() {
  const [open, setOpen] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);
  return { open, setOpen, field };
}
export type FindField = ReturnType<typeof useFindField>;
