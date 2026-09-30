/**
 * The canvas lab's (A91) component state: the controls, the graph and engine, and the
 * effects that push that state into the loop's view and camera.
 */
import { useEffect, useRef, useState, type MutableRef } from 'preact/hooks';
import type { RefObject } from 'preact';
import type { Graph } from '../../lib/graph-model';
import type { MapTheme } from '../../lib/graph-style';
import { domainBands, effectivePaint, termVisible } from '../../lib/graph-layout';
import { buildEngine, type Engine } from '../../lib/canvas-explorer/engine';
import { termFromSearch, withTermParam } from '../../lib/term-panel';
import { enterMode, focusOn, resetCamera } from './camera';
import {
  newCam,
  newView,
  panelReserve,
  reducedMotion,
  type Cam,
  type Mode,
  type View,
} from './state';

/** The loop's refs: the canvas, the engine, and the view and camera it reads. */
export type LabRefs = {
  canvas: RefObject<HTMLCanvasElement>;
  eng: MutableRef<Engine | null>;
  view: MutableRef<View>;
  cam: MutableRef<Cam>;
  /** The palette follows the page theme live (A92); the loop reads it every frame. */
  theme: MutableRef<MapTheme>;
};

export function useLabRefs(theme: MapTheme): LabRefs {
  const canvas = useRef<HTMLCanvasElement>(null);
  const eng = useRef<Engine | null>(null);
  const view = useRef<View>(newView());
  const cam = useRef<Cam>(newCam());
  const themeRef = useRef(theme);
  themeRef.current = theme;
  return { canvas, eng, view, cam, theme: themeRef };
}

/** Mode, auto-rotate, the selected term and the search query. */
export function useViewUi() {
  const [mode, setMode] = useState<Mode>('flat');
  const [spin, setSpin] = useState(() => !reducedMotion());
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  return { mode, setMode, spin, setSpin, selected, setSelected, query, setQuery };
}
export type ViewUi = ReturnType<typeof useViewUi>;

/** Domain and relationship-family filters, and backbone vs all edges. */
export function useFilters(familyKeys: string[]) {
  const [domains, setDomains] = useState<Set<string>>(new Set());
  const [families, setFamilies] = useState<Set<string>>(new Set(familyKeys));
  const [showAll, setShowAll] = useState(false);
  return { domains, setDomains, families, setFamilies, showAll, setShowAll };
}
export type Filters = ReturnType<typeof useFilters>;

/** A copy of `set` with `key` flipped. */
export function toggled(set: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

/** Fetch the graph, build the engine, enable every domain and open a deep link. */
export function useLabGraph(url: string, refs: LabRefs, ui: ViewUi, filters: Filters) {
  const [graph, setGraph] = useState<Graph | null>(null);
  useEffect(() => {
    fetch(url)
      .then((r) => r.json())
      .then((g: Graph) => {
        refs.eng.current = buildEngine(g);
        filters.setDomains(new Set(g.nodes.flatMap((n) => n.domain)));
        setGraph(g);
        openDeepLink(g, refs, ui.setSelected);
      });
  }, [url]);
  // The open term is kept in the address (`?term=`), as in the Explorer (A80).
  useEffect(() => {
    if (graph)
      history.replaceState(history.state, '', withTermParam(window.location.href, ui.selected));
  }, [graph, ui.selected]);
  return graph;
}

/** Select the `?term=` term and bring it into view, clear of the panel. */
function openDeepLink(g: Graph, refs: LabRefs, select: (id: string) => void) {
  const deep = termFromSearch(window.location.search);
  if (!deep || !g.nodes.some((n) => n.id === deep)) return;
  select(deep);
  focusOn(refs.cam.current, refs.eng.current!.ids.indexOf(deep), 1500);
}

/** Push React state into the loop's view; a mode switch moves the camera. */
export function useViewPush(refs: LabRefs, graph: Graph | null, ui: ViewUi, filters: Filters) {
  const { mode, spin, selected } = ui;
  const { showAll, families } = filters;
  useEffect(() => {
    const e = refs.eng.current;
    Object.assign(refs.view.current, { mode, showAll, spin, families, dirty: true });
    refs.view.current.selected = e && selected ? e.ids.indexOf(selected) : -1;
    const c = refs.cam.current;
    c.tcx = (c.w - (selected ? panelReserve() : 0)) / 2;
  }, [graph, mode, showAll, spin, families, selected]);
  // Only a mode switch moves the camera to that mode's view (a click keeps your orbit).
  useEffect(() => {
    enterMode(refs.cam.current, mode);
    refs.view.current.dirty = true;
  }, [mode]);
}

/** Domain filter and colours (split fills per enabled domain), and names, per term. */
export function useTermPaint(
  refs: LabRefs,
  graph: Graph | null,
  domains: Set<string>,
  lang: 'en' | 'da',
  theme: MapTheme,
) {
  useEffect(() => {
    const e = refs.eng.current;
    if (!e || !graph) return;
    graph.nodes.forEach((nd, i) => {
      e.visible[i] = termVisible(nd, domains) ? 1 : 0;
      e.fill[i] = effectivePaint(nd, domains, theme).fill;
      e.bands[i] = domainBands(nd, domains, theme);
      e.names[i] = nd.term[lang];
    });
    refs.view.current.dirty = true;
  }, [graph, domains, lang, theme]);
}

/** Reset view, and find a term (enabling its domain if it is filtered out). */
export function useLabActions(refs: LabRefs, graph: Graph | null, ui: ViewUi, filters: Filters) {
  const resetView = () => {
    resetCamera(refs.cam.current, ui.mode);
    refs.view.current.dirty = true;
  };
  const focusTerm = (id: string) => {
    const i = refs.eng.current?.ids.indexOf(id) ?? -1;
    if (i < 0) return;
    const nd = graph?.nodes.find((n) => n.id === id);
    if (nd && !termVisible(nd, filters.domains))
      filters.setDomains(new Set([...filters.domains, ...nd.domain]));
    ui.setSelected(id);
    focusOn(refs.cam.current, i, 900, 1.6);
    refs.view.current.dirty = true;
  };
  return { resetView, focusTerm };
}
