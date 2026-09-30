/**
 * The Explorer's model: every piece of its state, composed from hooks by responsibility.
 * The island's sections (the map, the bar, the legend, the panel) read from it.
 */
import { termVisible } from '../../lib/graph-layout';
import { useTheme } from '../../lib/use-theme';
import { useLegendOpen } from '../../lib/use-legend-open';
import { usePopoverGroup } from '../../lib/use-popover';
import { useBarSize } from '../../lib/use-explorer-bar';
import { useFindField, useTermSearch } from '../../lib/use-explorer-find';
import { arrive, useGraphIndex, useGraphLoad } from '../../lib/use-explorer-graph';
import { useFilters, useRoute, useSelection, useTermInAddress } from '../../lib/use-explorer-state';
import { usePaint, useViewControls, useVisible } from '../../lib/use-explorer-view';
import type { ExplorerProps, Pop } from './types';
import { useMapPair, viewOf } from './use-map-pair';

export function useExplorer(props: ExplorerProps) {
  const theme = useTheme();
  const reader = useReader(props);
  const { graph, index } = useExplorerGraph(props, reader);
  const controls = useViewControls(props.lab?.mode);
  const shown = useVisible(graph, reader.filters, reader.selection, controls);
  const paint = usePaint(controls.colourMode, reader.filters.domains, theme);
  const view = viewOf({ controls, ids: shown.ids, paint, ...reader });
  const maps = useMapPair(props, { graph, theme, selection: reader.selection, controls, view });
  const bar = useBar(controls.mode, props.lang);
  const search = useTermSearch(graph, index.byId, props.lang, props.semanticUrl);
  const x = { theme, graph, index, ...reader, controls, shown, maps, bar, search };
  return { ...x, pick: (id: string) => pick(id, x), findRoute: () => findRoute(x) };
}
export type Explorer = ReturnType<typeof useExplorer>;
/** The island's props and model: what each of its sections reads. */
export type Section = { p: ExplorerProps; x: Explorer };

/** What the reader sets: the filters, the selection, a lit route. */
function useReader(props: ExplorerProps) {
  const filters = useFilters(props.familyColours, props.lab?.showAll);
  const selection = useSelection();
  const route = useRoute(props.ui.noRoute);
  return { filters, selection, route };
}
type Reader = ReturnType<typeof useReader>;

/** The graph, loaded with the address's deep links applied and the open term kept in it. */
function useExplorerGraph(props: ExplorerProps, reader: Reader) {
  const lang = props.lang;
  const graph = useGraphLoad(props.graphUrl, (g) => arrive(g, { lang, ...reader }));
  useTermInAddress(graph, reader.selection.selected);
  return { graph, index: useGraphIndex(graph, lang) };
}

/** The bar's chrome: the legend beside it, the search field, its measured size, popovers. */
function useBar(mode: string, lang: string) {
  const legend = useLegendOpen();
  const find = useFindField();
  const size = useBarSize(find.open, [mode, legend.open, lang]);
  const [pop, setPop] = usePopoverGroup<Pop>(size.bar, 'xp-');
  return { legend, find, size, pop, setPop };
}

type Picked = Omit<Explorer, 'pick' | 'findRoute'>;

/** The route form's two names → the shortest path among the shown terms. */
function findRoute({ shown, index, route }: Picked): void {
  if (!shown.visible) return;
  const idOf = (name: string) => index.nameToId.get(name.trim().toLowerCase());
  route.show(shown.visible, idOf(route.fields.from), idOf(route.fields.to), index.name);
}

/** Find a term: make sure it is shown (its domain on, a layout that has it), select it. */
function reveal(id: string, { index, filters, controls, selection, maps }: Picked): boolean {
  const n = index.byId.get(id);
  if (!n) return false;
  if (!termVisible(n, filters.domains))
    filters.setDomains(new Set([...filters.domains, ...n.domain]));
  if (controls.mode === '2d' && controls.layout === 'time' && n.era === undefined)
    controls.setLayout('force');
  // A new selection glides into view by itself; the open term may have been panned away.
  if (id === selection.selected)
    (controls.mode === '3d' ? maps.map3d : maps.map2d.current)?.focus(id);
  selection.setSelected(id);
  return true;
}

/** A found term is revealed and selected; the search clears and its popovers close. */
function pick(id: string, x: Picked): void {
  if (!reveal(id, x)) return;
  x.search.setQuery('');
  x.bar.find.setOpen(false);
  x.bar.setPop(null);
}
