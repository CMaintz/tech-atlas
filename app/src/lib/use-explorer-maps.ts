/**
 * The Explorer's two maps: each built once from the graph and kept, then only
 * told what to show. The 3D map loads the first time it is opened and is paused while
 * hidden. Their options come from one wiring, so both answer the reader the same way.
 */
import { useEffect, useRef, useState, type MutableRef } from 'preact/hooks';
import type { Graph } from './graph-model';
import type { MapTheme } from './graph-style';
import { createMap2D, type Map2D, type Map2DOptions, type View } from './explorer-2d';
import type { Map3D } from './explorer-3d';
import type { Mode } from './explorer-view';
import { createKeyNav } from './explorer-keys';
import { useLatest } from './use-latest';
import { matchesMedia } from './use-media';
import { prefetchTerm } from '../components/TermPanel';

type Dict = Record<string, string>;
/** A term under a resting pointer, in map pixels (the hover card's anchor). */
export type Point = { id: string; x: number; y: number };
type Map3DOptions = Parameters<typeof import('./explorer-3d').createMap3D>[0];

/** What both maps are built with: labels, the reader's hand, and the theme then. */
export type MapWiring = {
  lang: 'en' | 'da';
  theme: MapTheme;
  clusterLabels: Dict;
  domainLabels: Dict;
  apiBase: string;
  relationNames: { label: Dict; inverse: Dict };
  selRef: MutableRef<string | null>;
  onSelect: (id: string | null) => void;
  onPoint: (hit: Point | null) => void;
  variant?: 'v2';
};

/** Pixels the docked term panel covers on the right of the map (lg: 26rem). */
const panelReserve = () => (window.innerWidth >= 1024 ? 416 : 0);
/** With a term open, the docked panel covers the right; otherwise nothing does. */
const selectedReserve = (w: MapWiring) => () => (w.selRef.current ? panelReserve() : 0);

function options2D(container: HTMLElement, graph: Graph, w: MapWiring): Map2DOptions {
  return {
    container,
    graph,
    lang: w.lang,
    clusterLabels: w.clusterLabels,
    domainLabels: w.domainLabels,
    reserveRight: selectedReserve(w),
    centreReserve: panelReserve,
    onSelect: w.onSelect,
    // A double click opens the panel too — never a page load.
    onOpen: w.onSelect,
    onHover: (id) => prefetchTerm(w.apiBase, id),
    onPoint: w.onPoint,
    theme: w.theme,
    relationNames: w.relationNames,
    variant: w.variant,
  };
}

function options3D(container: HTMLElement, graph: Graph, w: MapWiring): Map3DOptions {
  return {
    container,
    graph,
    lang: w.lang,
    onSelect: w.onSelect,
    reserveRight: selectedReserve(w),
    onHover: (id) => prefetchTerm(w.apiBase, id),
    onPoint: w.onPoint,
    theme: w.theme,
    domainLabels: w.domainLabels,
    clusterLabels: w.clusterLabels,
    relationNames: w.relationNames,
    variant: w.variant,
  };
}

/** The 2D map in `box`: built once the graph is in, rethemed live, told what to show. */
export function useMap2D(
  box: MutableRef<HTMLElement | null>,
  graph: Graph | null,
  w: MapWiring,
  view: View,
) {
  const map = useRef<Map2D | null>(null);
  useEffect(() => {
    if (!graph || !box.current) return;
    const m = createMap2D(options2D(box.current, graph, w));
    map.current = m;
    return () => {
      m.destroy();
      map.current = null;
    };
  }, [graph]);
  useEffect(() => map.current?.retheme(w.theme), [w.theme]);
  useShow2D(map, graph, view);
  return map;
}

/** The 2D map is told what to show whenever any part of the view changes. */
function useShow2D(map: MutableRef<Map2D | null>, graph: Graph | null, v: View) {
  const { layout, nodes, domains, families, showAll, selected, highlight, hoodLit } = v;
  useEffect(() => {
    map.current?.apply(v);
  }, [
    graph,
    layout,
    nodes,
    domains,
    families,
    showAll,
    selected,
    highlight,
    hoodLit,
    v.colour,
    v.bands,
  ]);
}

/** The 3D map in `box`: built (lazily loaded) the first time 3D is opened, then kept. */
export function useMap3D(
  box: MutableRef<HTMLElement | null>,
  graph: Graph | null,
  mode: Mode,
  w: MapWiring,
) {
  const [map, setMap] = useState<Map3D | null>(null);
  useEffect(() => {
    if (mode !== '3d' || map || !graph || !box.current) return;
    let cancelled = false;
    import('./explorer-3d')
      .then(({ createMap3D }) => createMap3D(options3D(box.current!, graph, w)))
      .then((m) => {
        if (cancelled) m.destroy();
        else setMap(m);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, graph]);
  useEffect(() => () => map?.destroy(), [map]);
  return map;
}

type Shown = {
  mode: Mode;
  spin: boolean;
  theme: MapTheme;
  map2d: MutableRef<Map2D | null>;
  /** The pointer's hover card is dropped when the view switches. */
  onPoint: (hit: Point | null) => void;
};

/** The built 3D map follows the view: auto-rotate, theme, shown or paused, what to show. */
export function useMap3DView(map: Map3D | null, s: Shown, view: View) {
  useEffect(() => map?.spin(s.spin), [map, s.spin]);
  useEffect(() => map?.retheme(s.theme), [map, s.theme]);
  useEffect(() => {
    s.onPoint(null);
    map?.show(s.mode === '3d');
    if (s.mode === '2d' && s.map2d.current) {
      s.map2d.current.resize();
    }
  }, [s.mode, map]);
  const { nodes, families, showAll, selected, highlight, hoodLit, colour, bands } = view;
  useEffect(() => {
    map?.apply({ nodes, families, showAll, selected, highlight, hoodLit, colour, bands });
  }, [map, nodes, families, showAll, selected, highlight, hoodLit, colour, bands]);
}

type Moved = {
  host: MutableRef<HTMLElement | null>;
  mode: Mode;
  map2d: MutableRef<Map2D | null>;
  map3d: Map3D | null;
  /** A key setting the map moving drops the hover card. */
  onPoint: (hit: Point | null) => void;
};

/** WASD / arrows move the shown map while it has focus or the pointer. */
export function useKeyNav({ host, mode, map2d, map3d, onPoint }: Moved) {
  const modeRef = useLatest(mode);
  const map3dRef = useLatest(map3d);
  useEffect(() => {
    if (!host.current) return;
    const nav = createKeyNav({
      host: host.current,
      mode: () => modeRef.current,
      reduced: () => matchesMedia('(prefers-reduced-motion: reduce)'),
      start: () => onPoint(null),
      move: (v, dt) => (modeRef.current === '3d' ? map3dRef.current : map2d.current)?.nudge(v, dt),
    });
    return () => nav.destroy();
  }, []);
}

/** The hidden lab is handed the built maps, to tune them live. */
export function useLabMaps(
  onMaps: ((maps: { map2d: Map2D | null; map3d: Map3D | null }) => void) | undefined,
  graph: Graph | null,
  map2d: MutableRef<Map2D | null>,
  map3d: Map3D | null,
) {
  useEffect(() => onMaps?.({ map2d: map2d.current, map3d }), [graph, map3d]);
}
