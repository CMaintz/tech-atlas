import { useMemo, useState } from 'preact/hooks';
import type { Graph, GraphNode } from './graph-model';
import type { MapTheme } from './graph-style';
import { domainBands, effectivePaint } from './graph-layout';
import type { Layout } from './explorer-2d';
import {
  knowledgeColour,
  undatedCount,
  visibleGraph,
  visibleTermIds,
  type Mode,
} from './explorer-view';
import { useLearner } from './use-learner';
import type { Filters, Selection } from './use-explorer-state';

export type ColourMode = 'cluster' | 'knowledge';

export function useViewControls(labMode?: Mode) {
  const [mode, setMode] = useState<Mode>(labMode ?? '2d');
  const [layout, setLayout] = useState<Layout>('force');
  const [colourMode, setColourMode] = useState<ColourMode>('cluster');
  const [spin, setSpin] = useState(false);
  return { mode, setMode, layout, setLayout, colourMode, setColourMode, spin, setSpin };
}
export type ViewControls = ReturnType<typeof useViewControls>;

/** What the reader has chosen to see. */
type Chosen = { filters: Filters; selection: Selection };

export function useVisible(graph: Graph | null, reader: Chosen, controls: ViewControls) {
  const { domains, families } = reader.filters;
  const { selected, hops } = reader.selection;
  const { mode, layout } = controls;
  const ids = useMemo<Set<string>>(() => {
    if (!graph) return new Set();
    const datedOnly = mode === '2d' && layout === 'time';
    return visibleTermIds(graph, { domains, datedOnly, hops, selected });
  }, [graph, domains, mode, layout, hops, hops === null ? null : selected]);
  const visible = useMemo<Graph | null>(
    () => (graph ? visibleGraph(graph, ids, families) : null),
    [graph, ids, families],
  );
  const undated = useMemo(() => undatedCount(graph?.nodes ?? [], domains), [graph, domains]);
  return { ids, visible, undated };
}

export function usePaint(colourMode: ColourMode, domains: ReadonlySet<string>, theme: MapTheme) {
  const learner = useLearner();
  const colour = useMemo(
    () => (n: GraphNode) =>
      colourMode === 'cluster'
        ? effectivePaint(n, domains, theme).fill
        : knowledgeColour(learner.terms[n.id], theme),
    [colourMode, learner, domains, theme],
  );
  const bands = useMemo(
    () => (n: GraphNode) => (colourMode === 'cluster' ? domainBands(n, domains, theme) : []),
    [colourMode, domains, theme],
  );
  return { colour, bands };
}
export type Paint = ReturnType<typeof usePaint>;
