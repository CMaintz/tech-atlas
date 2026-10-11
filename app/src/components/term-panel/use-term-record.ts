import { useEffect, useState } from 'preact/hooks';
import type { Graph } from '../../lib/graph-model';
import { neighbourIds, type TermRecord } from '../../lib/term-panel';
import type { TermCache } from './term-cache';

const NEIGHBOURS_WARMED_ON_OPEN = 12;

export function useTermRecord(cache: TermCache, graph: Graph, id: string) {
  const [loaded, setLoaded] = useState<TermRecord | undefined>(() => cache.peek(id));
  const [failedId, setFailedId] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    cache.load(id).then(
      (r) => live && setLoaded(r),
      () => live && setFailedId(id),
    );
    const cancelWarm = warmNeighboursSoon(cache, graph, id);
    return () => {
      live = false;
      cancelWarm();
    };
  }, [id]);
  const record = loaded?.id === id ? loaded : cache.peek(id);
  return { record, failed: failedId === id && !record };
}

function warmNeighboursSoon(cache: TermCache, graph: Graph, id: string) {
  const warm = window.setTimeout(
    () => neighbourIds(graph, id).slice(0, NEIGHBOURS_WARMED_ON_OPEN).forEach(cache.prefetch),
    300,
  );
  return () => window.clearTimeout(warm);
}
