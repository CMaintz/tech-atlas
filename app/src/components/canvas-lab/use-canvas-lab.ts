import { useMemo } from 'preact/hooks';
import type { Graph } from '../../lib/graph-model';
import { familyColours, type MapTheme } from '../../lib/graph-style';
import { useTheme } from '../../lib/use-theme';
import { domainOrder } from '../../lib/canvas-explorer';
import type { AboutProps } from '../../lib/about-assets';
import { prefetchTerm, type PanelConfig } from '../TermPanel';
import { TEXT, type Dict, type Lang } from './text';
import { useCanvasLoop } from './use-canvas-loop';
import {
  useFilters,
  useLabActions,
  useLabGraph,
  useLabRefs,
  useTermPaint,
  useViewPush,
  useViewUi,
  type ViewUi,
} from './use-lab-state';

export interface CanvasLabProps {
  lang: Lang;
  graphUrl: string;
  termBase: string;
  explorerUrl: string;
  ui: Dict;
  clusterLabels: Dict;
  graphUi: Dict;
  familyLabels: Dict;
  familyColours: Dict;
  domainLabels: Dict;
  panel: PanelConfig;
  about: AboutProps;
}

export type Chrome = {
  t: Dict;
  lang: Lang;
  theme: MapTheme;
  allDomains: string[];
  familyKeys: string[];
  famColours: Record<string, string>;
  site: CanvasLabProps;
};

export type CanvasLab = ReturnType<typeof useCanvasLab>;

export function useCanvasLab(props: CanvasLabProps) {
  const theme = useTheme();
  const familyKeys = Object.keys(props.familyColours);
  const refs = useLabRefs(theme);
  const ui = useViewUi();
  const filters = useFilters(familyKeys);
  const graph = useLabGraph(props.graphUrl, { refs, ui, filters });
  const lab = { refs, ui, filters, graph };
  useViewPush(lab);
  useTermPaint(lab, { lang: props.lang, theme });
  const hooks = pointerHooks(ui, props.panel.apiBase);
  useCanvasLoop(refs, graph, { allFamilies: familyKeys, hooks });
  const actions = useLabActions(lab);
  const { byId, allDomains } = useGraphIndex(graph);
  const chrome = chromeOf(props, { theme, allDomains, familyKeys });
  const sel = ui.selected ? byId.get(ui.selected) : undefined;
  return { refs, ui, filters, graph, actions, chrome, sel };
}

const pointerHooks = (ui: ViewUi, apiBase: string) => ({
  select: ui.setSelected,
  stopSpin: () => ui.setSpin(false),
  prefetch: (id: string) => prefetchTerm(apiBase, id),
});

function useGraphIndex(graph: Graph | null) {
  const byId = useMemo(() => new Map((graph?.nodes ?? []).map((n) => [n.id, n])), [graph]);
  const allDomains = useMemo(
    () => domainOrder((graph?.nodes ?? []).flatMap((n) => n.domain)),
    [graph],
  );
  return { byId, allDomains };
}

function chromeOf(
  site: CanvasLabProps,
  { theme, allDomains, familyKeys }: Pick<Chrome, 'theme' | 'allDomains' | 'familyKeys'>,
): Chrome {
  const famColours = familyColours(theme) as Record<string, string>;
  return { t: TEXT[site.lang], lang: site.lang, theme, allDomains, familyKeys, famColours, site };
}
