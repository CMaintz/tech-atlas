/** The published graph (graph.json) for an island; null until it has loaded. */
import { useEffect, useState } from 'preact/hooks';
import type { Graph } from './graph-model';

export function useGraph(graphUrl: string): Graph | null {
  const [graph, setGraph] = useState<Graph | null>(null);
  useEffect(() => {
    fetch(graphUrl)
      .then((r) => r.json())
      .then(setGraph);
  }, [graphUrl]);
  return graph;
}
