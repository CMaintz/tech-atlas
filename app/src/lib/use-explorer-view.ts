/** How the Explorer draws: the view controls, the shown terms, and each term's paint. */
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

/** The bar's view choices: 2D/3D, the 2D layout, the colouring, the 3D auto-rotate. */
export function useViewControls(labMode?: Mode) {
  const [mode, setMode] = useState<Mode>(labMode ?? '2d');
  const [layout, setLayout] = useState<Layout>('force');
  const [colourMode, setColourMode] = useState<ColourMode>('cluster');
  const [spin, setSpin] = useState(false);
  return { mode, setMode, layout, setLayout, colourMode, setColourMode, spin, setSpin };
}
export type ViewControls = ReturnType<typeof useViewControls>;

/** The shown terms and links, and how many dated-layout terms have no era. */
export function useVisible(
  graph: Graph | null,
  { domains, families }: Filters,
  { selected, hops }: Selection,
  { mode, layout }: ViewControls,
) {
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

/** Each term's fill and split bands, by the colour mode and theme. */
export function usePaint(colourMode: ColourMode, domains: ReadonlySet<string>, theme: MapTheme) {
  const learner = useLearner();
  const colour = useMemo(
    () => (n: GraphNode) =>
      colourMode === 'cluster'
        ? effectivePaint(n, domains, theme).fill
        : knowledgeColour(learner.terms[n.id], theme),
    [colourMode, learner, domains, theme],
  );
  /** A shared term's split fill, one band per enabled domain (cluster colouring only). */
  const bands = useMemo(
    () => (n: GraphNode) => (colourMode === 'cluster' ? domainBands(n, domains, theme) : []),
    [colourMode, domains, theme],
  );
  return { colour, bands };
}
export type Paint = ReturnType<typeof usePaint>;
