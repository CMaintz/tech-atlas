import { useEffect, useState } from 'preact/hooks';
import type { Graph } from '../../lib/graph-model';
import { neighbourIds, type TermRecord } from '../../lib/term-panel';
import type { TermCache } from './term-cache';

/** How many neighbours are warmed when a term opens. */
const PREFETCH_NEIGHBOURS = 12;

/**
 * The per-term record for `id`: loaded (instant when cached), with the neighbours' records
 * warmed shortly after. Derived at render time, so a previous term's facets, aliases or
 * error never paint beside the new term while its record loads.
 */
export function useTermRecord(cache: TermCache, graph: Graph, id: string) {
  const [loaded, setLoaded] = useState<TermRecord | undefined>(() => cache.peek(id));
  /** The id whose record failed to load — never shown next to another term. */
  const [failedId, setFailedId] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    cache.load(id).then(
      (r) => live && setLoaded(r),
      () => live && setFailedId(id),
    );
    const warm = window.setTimeout(
      () => neighbourIds(graph, id).slice(0, PREFETCH_NEIGHBOURS).forEach(cache.prefetch),
      300,
    );
    return () => {
      live = false;
      window.clearTimeout(warm);
    };
  }, [id]);
  const record = loaded?.id === id ? loaded : cache.peek(id);
  return { record, failed: failedId === id && !record };
}
