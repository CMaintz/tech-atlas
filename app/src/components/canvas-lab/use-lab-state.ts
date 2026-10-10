import { useEffect, useRef, useState, type MutableRef } from 'preact/hooks';
import type { RefObject } from 'preact';
import type { Graph } from '../../lib/graph-model';
import type { MapTheme } from '../../lib/graph-style';
import { domainBands, effectivePaint, termVisible } from '../../lib/graph-layout';
import { buildEngine, type Engine } from '../../lib/canvas-explorer/engine';
import { termFromSearch, withTermParam } from '../../lib/term-panel';
import { useGraphLoad } from '../../lib/use-explorer-graph';
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

export type LabRefs = {
  canvas: RefObject<HTMLCanvasElement>;
  eng: MutableRef<Engine | null>;
  view: MutableRef<View>;
  cam: MutableRef<Cam>;
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

export function useViewUi() {
  const [mode, setMode] = useState<Mode>('flat');
  const [spin, setSpin] = useState(() => !reducedMotion());
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  return { mode, setMode, spin, setSpin, selected, setSelected, query, setQuery };
}
export type ViewUi = ReturnType<typeof useViewUi>;

export function useFilters(familyKeys: string[]) {
  const [domains, setDomains] = useState<Set<string>>(new Set());
  const [families, setFamilies] = useState<Set<string>>(new Set(familyKeys));
  const [showAll, setShowAll] = useState(false);
  return { domains, setDomains, families, setFamilies, showAll, setShowAll };
}
export type Filters = ReturnType<typeof useFilters>;

export type LabControls = { refs: LabRefs; ui: ViewUi; filters: Filters };
export type LabState = LabControls & { graph: Graph | null };

export function useLabGraph(url: string, lab: LabControls) {
  const graph = useGraphLoad(url, (g) => startLab(g, lab));
  useEffect(() => {
    if (graph)
      history.replaceState(history.state, '', withTermParam(window.location.href, lab.ui.selected));
  }, [graph, lab.ui.selected]);
  return graph;
}

function startLab(g: Graph, lab: LabControls) {
  const e = buildEngine(g);
  lab.refs.eng.current = e;
  lab.filters.setDomains(new Set(g.nodes.flatMap((n) => n.domain)));
  openDeepLink(g, e, lab);
}

function openDeepLink(g: Graph, e: Engine, { refs, ui }: LabControls) {
  const deep = termFromSearch(window.location.search);
  if (!deep || !g.nodes.some((n) => n.id === deep)) return;
  ui.setSelected(deep);
  focusOn(refs.cam.current, e.ids.indexOf(deep), { ms: 1500 });
}

export function useViewPush({ refs, graph, ui, filters }: LabState) {
  const { mode, spin, selected } = ui;
  const { showAll, families } = filters;
  useEffect(() => {
    const e = refs.eng.current;
    Object.assign(refs.view.current, { mode, showAll, spin, families, dirty: true });
    refs.view.current.selected = e && selected ? e.ids.indexOf(selected) : -1;
    const c = refs.cam.current;
    c.tcx = (c.w - (selected ? panelReserve() : 0)) / 2;
  }, [graph, mode, showAll, spin, families, selected]);
  useEffect(() => {
    enterMode(refs.cam.current, mode);
    refs.view.current.dirty = true;
  }, [mode]);
}

export function useTermPaint(
  { refs, graph, filters }: LabState,
  { lang, theme }: { lang: 'en' | 'da'; theme: MapTheme },
) {
  const { domains } = filters;
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

export function useLabActions({ refs, graph, ui, filters }: LabState) {
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
    focusOn(refs.cam.current, i, { ms: 900, minZoom: 1.6 });
    refs.view.current.dirty = true;
  };
  return { resetView, focusTerm };
}
