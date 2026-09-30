/**
 * The Explorer's pair of maps as one piece of its model: both built from one wiring and
 * told one view, moved by the keyboard, raising the hover card, handed to the lab.
 */
import { useMemo, useRef } from 'preact/hooks';
import type { Graph } from '../../lib/graph-model';
import type { MapTheme } from '../../lib/graph-style';
import type { View } from '../../lib/explorer-2d';
import { useHoverCard } from '../../lib/use-hover-card';
import {
  useKeyNav,
  useLabMaps,
  useMap2D,
  useMap3D,
  useMap3DView,
  type MapWiring,
  type Point,
} from '../../lib/use-explorer-maps';
import type { Filters, Route, Selection } from '../../lib/use-explorer-state';
import type { Paint, ViewControls } from '../../lib/use-explorer-view';
import type { ExplorerProps } from './types';

type ViewParts = {
  controls: ViewControls;
  ids: ReadonlySet<string>;
  filters: Filters;
  selection: Selection;
  route: Route;
  paint: Paint;
};

/** What both maps are told to show. */
export function viewOf({ controls, ids, filters, selection, route, paint }: ViewParts): View {
  return {
    layout: controls.layout,
    nodes: ids,
    domains: filters.domains,
    families: filters.families,
    showAll: filters.showAll,
    selected: selection.selected,
    highlight: route.lit,
    colour: paint.colour,
    bands: paint.bands,
  };
}

type Hands = {
  theme: MapTheme;
  selection: Selection;
  onPoint: (hit: Point | null) => void;
  relationNames: MapWiring['relationNames'];
};

/** The maps' wiring, and the hover card their pointer callback raises. */
function useWiring(props: ExplorerProps, theme: MapTheme, selection: Selection) {
  const { card, onPoint } = useHoverCard();
  /** Relationship names for the lit links, read from either end (A97a). */
  const { edgeLabels: label, edgeInverse: inverse } = props.panel;
  const relationNames = useMemo(() => ({ label, inverse }), [props.panel]);
  return { card, wiring: wiringOf(props, { theme, selection, onPoint, relationNames }) };
}

/** The page's labels and the reader's hand, as both maps are built with them. */
function wiringOf(props: ExplorerProps, { theme, selection, onPoint, relationNames }: Hands) {
  return {
    lang: props.lang,
    theme,
    clusterLabels: props.clusterLabels,
    domainLabels: props.domainLabels,
    apiBase: props.panel.apiBase,
    relationNames,
    selRef: selection.selRef,
    onSelect: selection.setSelected,
    onPoint,
  } satisfies MapWiring;
}

type MapsIn = {
  graph: Graph | null;
  theme: MapTheme;
  selection: Selection;
  controls: ViewControls;
  view: View;
};

/** Both maps, the keyboard that moves them, the hover card they raise, the lab hand-off. */
export function useMapPair(
  props: ExplorerProps,
  { graph, theme, selection, controls, view }: MapsIn,
) {
  const box2d = useRef<HTMLDivElement>(null);
  const box3d = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const { card, wiring } = useWiring(props, theme, selection);
  const onPoint = wiring.onPoint;
  const map2d = useMap2D(box2d, graph, wiring, view);
  const { mode, spin } = controls;
  const map3d = useMap3D(box3d, graph, mode, wiring);
  useKeyNav({ host, mode, map2d, map3d, onPoint });
  useMap3DView(map3d, { mode, spin, theme, map2d, onPoint }, view);
  useLabMaps(props.lab?.onMaps, graph, map2d, map3d);
  return { box2d, box3d, host, map2d, map3d, card, onPoint };
}
