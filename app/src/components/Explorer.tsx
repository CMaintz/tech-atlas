import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { prerequisitesOf, shortestPath, type Graph, type GraphNode } from '../lib/graph-model';
import { loadLearner, type Learner } from '../lib/learner';
import { domainColour, homeDomain } from '../lib/graph-style';
import { domainBands, effectiveHome, effectivePaint, termVisible } from '../lib/graph-layout';
import { createMap2D, type Layout, type Map2D } from '../lib/explorer-2d';
import type { Map3D } from '../lib/explorer-3d';
import GraphLegend from './GraphLegend';
import TermPanel, { prefetchTerm, type PanelConfig } from './TermPanel';
import { termFromSearch, withTermParam } from '../lib/term-panel';

type Lang = 'en' | 'da';
type Dict = Record<string, string>;

interface Props {
  lang: Lang;
  graphUrl: string;
  termBase: string;
  ui: Dict;
  clusterLabels: Dict;
  /** Legend and canvas-control strings (site.ts GRAPH_UI). */
  graphUi: Dict;
  familyLabels: Dict;
  familyColours: Dict;
  domainLabels: Dict;
  /** The term panel's strings and data locations (A80). */
  panel: PanelConfig;
}

type Mode = '2d' | '3d';
type ColourMode = 'cluster' | 'knowledge';

/** Personal knowledge map colours (SPEC §9): what you know, and what you don't. */
const KNOWLEDGE_COLOURS: Record<string, string> = {
  know: '#22c55e',
  familiar: '#84cc16',
  learning: '#f59e0b',
  unknown: '#ef4444',
};

/** The legend starts open on wide screens, where it sits beside the map. */
const legendOpenAtStart = () => window.innerWidth >= 1024;
/** Pixels the map keeps clear on the right for the open legend. */
const legendReserve = () => (legendOpenAtStart() ? 310 : 0);
/** Pixels the docked term panel covers on the right of the map (lg: 26rem). */
const panelReserve = () => (window.innerWidth >= 1024 ? 416 : 0);

/**
 * The full-map explorer (SPEC §7, A79). Every node links to a real, statically rendered
 * page: the canvas is an index, not a container. The 2D and 3D maps are each built once
 * and kept; every control below only changes what they show.
 */
export default function Explorer(props: Props) {
  const { lang, graphUrl, termBase, ui } = props;
  const [graph, setGraph] = useState<Graph | null>(null);
  const [mode, setMode] = useState<Mode>('2d');
  const [layout, setLayout] = useState<Layout>('force');
  const [domains, setDomains] = useState<Set<string>>(new Set());
  const [families, setFamilies] = useState<Set<string>>(new Set(Object.keys(props.familyColours)));
  const [showAll, setShowAll] = useState(false);
  /** The selected term: a single callback sets it (a side panel may read it later). */
  const [selected, setSelected] = useState<string | null>(null);
  const onSelect = (id: string | null) => setSelected(id);
  const selRef = useRef(selected);
  selRef.current = selected;
  const [highlight, setHighlight] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [routeMsg, setRouteMsg] = useState('');
  /** Hops shown around the selected term; null = the whole map (SPEC §7: progressive). */
  const [hops, setHops] = useState<number | null>(null);
  const [colourMode, setColourMode] = useState<ColourMode>('cluster');
  const [learner, setLearner] = useState<Learner>({ terms: {} });
  useEffect(() => {
    const refresh = () => setLearner(loadLearner());
    refresh();
    window.addEventListener('atlas:learner', refresh);
    return () => window.removeEventListener('atlas:learner', refresh);
  }, []);
  const box2d = useRef<HTMLDivElement>(null);
  const box3d = useRef<HTMLDivElement>(null);
  const map2d = useRef<Map2D | null>(null);
  const [map3d, setMap3d] = useState<Map3D | null>(null);

  useEffect(() => {
    fetch(graphUrl)
      .then((r) => r.json())
      .then((g: Graph) => {
        setGraph(g);
        setDomains(new Set(g.nodes.flatMap((n) => n.domain)));
        const params = new URLSearchParams(window.location.search);
        const focus = params.get('focus');
        const nodeOf = (id: string | null) => g.nodes.find((n) => n.id === id);
        const na = nodeOf(params.get('from'));
        const nb = nodeOf(params.get('to'));
        if (na && nb) {
          // Arriving from a search intent: show the route between the two terms.
          const path = shortestPath(g, na.id, nb.id);
          setFrom(na.term[lang]);
          setTo(nb.term[lang]);
          setHighlight(path ?? []);
          setRouteMsg(path ? path.map((id) => nodeOf(id)!.term[lang]).join(' → ') : ui.noRoute);
        }
        if (focus && g.nodes.some((n) => n.id === focus)) {
          // Arriving from a term page: start at the focal term and its direct edges.
          setSelected(focus);
          setHops(1);
        }
        // A deep link (`?term=`) opens that term's panel (A80).
        const deep = termFromSearch(window.location.search);
        if (deep && g.nodes.some((n) => n.id === deep)) setSelected(deep);
      });
  }, [graphUrl]);

  // The open term is kept in the address (`?term=`), so the view can be shared (A80).
  useEffect(() => {
    if (graph)
      history.replaceState(history.state, '', withTermParam(window.location.href, selected));
  }, [graph, selected]);

  const byId = useMemo(() => new Map((graph?.nodes ?? []).map((n) => [n.id, n])), [graph]);
  const nameToId = useMemo(
    () => new Map((graph?.nodes ?? []).map((n) => [n.term[lang].toLowerCase(), n.id])),
    [graph, lang],
  );

  /** Terms shown: the domain filter (A79), the time layout's dated terms, a neighbourhood. */
  const visibleIds = useMemo<Set<string>>(() => {
    if (!graph) return new Set();
    const timeOnly = mode === '2d' && layout === 'time';
    const base = graph.nodes.filter(
      (n) => termVisible(n, domains) && (!timeOnly || n.era !== undefined),
    );
    const ids = new Set(base.map((n) => n.id));
    if (hops === null || !selected || !ids.has(selected)) return ids;
    const near = new Set([selected]);
    let frontier = new Set([selected]);
    for (let h = 0; h < hops; h++) {
      const next = new Set<string>();
      for (const l of graph.links) {
        if (!families.has(l.family) || !ids.has(l.source) || !ids.has(l.target)) continue;
        if (frontier.has(l.source) && !near.has(l.target)) next.add(l.target);
        if (frontier.has(l.target) && !near.has(l.source)) next.add(l.source);
      }
      for (const id of next) near.add(id);
      frontier = next;
    }
    return near;
  }, [graph, domains, families, mode, layout, hops, hops === null ? null : selected]);

  const visible = useMemo<Graph | null>(() => {
    if (!graph) return null;
    return {
      nodes: graph.nodes.filter((n) => visibleIds.has(n.id)),
      links: graph.links.filter(
        (l) => families.has(l.family) && visibleIds.has(l.source) && visibleIds.has(l.target),
      ),
    };
  }, [graph, visibleIds, families]);

  const colourOf = useMemo(
    () => (n: GraphNode) => {
      if (colourMode === 'cluster') return effectivePaint(n, domains).fill;
      const s = learner.terms[n.id];
      const status = s?.status ?? ((s?.box ?? 0) >= 3 ? 'know' : s?.box ? 'learning' : undefined);
      return status ? KNOWLEDGE_COLOURS[status] : '#404040';
    },
    [colourMode, learner, domains],
  );
  /** A shared term's split fill, one band per enabled domain (cluster colouring only). */
  const bandsOf = useMemo(
    () => (n: GraphNode) => (colourMode === 'cluster' ? domainBands(n, domains) : []),
    [colourMode, domains],
  );
  const hl = useMemo(() => new Set(highlight), [highlight]);
  const undated = useMemo(
    () =>
      (graph ?? { nodes: [] }).nodes.filter((n) => termVisible(n, domains) && n.era === undefined)
        .length,
    [graph, domains],
  );

  // ---- 2D: built once, then only told what to show --------------------------------------
  useEffect(() => {
    if (!graph || !box2d.current) return;
    const m = createMap2D({
      container: box2d.current,
      graph,
      lang,
      clusterLabels: props.clusterLabels,
      domainLabels: props.domainLabels,
      // With a term open, the docked panel covers the right; otherwise the legend does.
      reserveRight: () => (selRef.current ? panelReserve() : legendReserve()),
      centreReserve: panelReserve,
      onSelect,
      // A double click opens the panel too — never a page load (A80).
      onOpen: onSelect,
      onHover: (id) => prefetchTerm(props.panel.apiBase, id),
    });
    map2d.current = m;
    return () => {
      m.destroy();
      map2d.current = null;
    };
  }, [graph]);

  useEffect(() => {
    map2d.current?.apply({
      layout,
      nodes: visibleIds,
      domains,
      families,
      showAll,
      selected,
      highlight: hl,
      colour: colourOf,
      bands: bandsOf,
    });
  }, [graph, layout, visibleIds, domains, families, showAll, selected, hl, colourOf, bandsOf]);

  // ---- 3D: built the first time it is opened, then kept (paused while hidden) ---------
  useEffect(() => {
    if (mode !== '3d' || map3d || !graph || !box3d.current) return;
    let cancelled = false;
    import('../lib/explorer-3d')
      .then(({ createMap3D }) =>
        createMap3D({
          container: box3d.current!,
          graph,
          lang,
          onSelect,
          reserveRight: () => (selRef.current ? panelReserve() : legendReserve()),
          onHover: (id) => prefetchTerm(props.panel.apiBase, id),
        }),
      )
      .then((m) => {
        if (cancelled) m.destroy();
        else setMap3d(m);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, graph]);
  useEffect(() => () => map3d?.destroy(), [map3d]);
  useEffect(() => {
    map3d?.show(mode === '3d');
    if (mode === '2d' && map2d.current) {
      map2d.current.resize();
    }
  }, [mode, map3d]);
  useEffect(() => {
    map3d?.apply({
      nodes: visibleIds,
      families,
      showAll,
      selected,
      highlight: hl,
      colour: colourOf,
      bands: bandsOf,
    });
  }, [map3d, visibleIds, families, showAll, selected, hl, colourOf, bandsOf]);

  // ---- Tools -----------------------------------------------------------
  const findRoute = () => {
    if (!visible) return;
    const a = nameToId.get(from.trim().toLowerCase());
    const b = nameToId.get(to.trim().toLowerCase());
    const path = a && b ? shortestPath(visible, a, b) : null;
    setHighlight(path ?? []);
    setRouteMsg(path ? path.map((id) => byId.get(id)!.term[lang]).join(' → ') : ui.noRoute);
  };
  const showPrerequisites = (id: string) => {
    if (!graph) return;
    setHighlight([id, ...prerequisitesOf(graph, id).map((n) => n.id)]);
    setRouteMsg('');
  };
  const toggle = (set: Set<string>, key: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    apply(next);
  };

  const sel = selected ? byId.get(selected) : undefined;
  const closePanel = useCallback(() => setSelected(null), []);
  const allDomains = [...new Set((graph?.nodes ?? []).flatMap((n) => n.domain))];
  // The legend lists only enabled domains; re-homed shared terms wear their domain colour.
  const legendNodes = (visible?.nodes ?? [])
    .filter((n) => effectiveHome(n, domains) === homeDomain(n))
    .map((n) => ({ cluster: n.cluster, domain: n.domain.filter((d) => domains.has(d)) }));
  const button = (active: boolean) =>
    `rounded border px-2 py-1 text-xs ${active ? 'border-neutral-300 text-neutral-100' : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'}`;
  const overlayButton =
    'pointer-events-auto rounded border border-neutral-700 bg-neutral-950/85 px-2 py-1 text-xs text-neutral-300 hover:border-neutral-500';

  return (
    <div class="relative flex h-[calc(100vh-4.25rem)] flex-col lg:flex-row">
      <aside class="w-full shrink-0 space-y-5 overflow-y-auto border-neutral-800 p-4 text-sm lg:w-80 lg:border-r">
        <div>
          <h1 class="text-xl font-semibold">{ui.explorer}</h1>
          <p class="mt-1 text-xs text-neutral-500">{ui.explorerIntro}</p>
        </div>

        <div class="flex flex-wrap gap-2" data-tour="explorer-layouts">
          <button class={button(mode === '2d')} onClick={() => setMode('2d')}>
            2D
          </button>
          <button class={button(mode === '3d')} onClick={() => setMode('3d')}>
            3D
          </button>
          {mode === '2d' && (
            <>
              <button class={button(layout === 'force')} onClick={() => setLayout('force')}>
                {ui.layoutForce}
              </button>
              <button class={button(layout === 'depth')} onClick={() => setLayout('depth')}>
                {ui.layoutDepth}
              </button>
              <button class={button(layout === 'time')} onClick={() => setLayout('time')}>
                {ui.layoutTime}
              </button>
            </>
          )}
        </div>
        {mode === '3d' && <p class="text-xs text-neutral-500">{ui.galaxyNote}</p>}
        {mode === '2d' && layout === 'depth' && (
          <p class="text-xs text-neutral-500">{ui.depthNote}</p>
        )}
        {mode === '2d' && layout === 'time' && (
          <p class="text-xs text-neutral-500">
            {ui.timeNote}{' '}
            {undated > 0 &&
              (undated === 1 ? ui.undatedNoteOne : ui.undatedNote.replace('{n}', String(undated)))}
          </p>
        )}

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs tracking-widest text-neutral-500 uppercase">{ui.colourBy}</span>
          <button class={button(colourMode === 'cluster')} onClick={() => setColourMode('cluster')}>
            {ui.byCluster}
          </button>
          <button
            class={button(colourMode === 'knowledge')}
            onClick={() => setColourMode('knowledge')}
          >
            {ui.byKnowledge}
          </button>
        </div>

        <fieldset data-tour="explorer-filters">
          <legend class="mb-1 text-xs tracking-widest text-neutral-500 uppercase">
            {ui.domains}
          </legend>
          {allDomains.map((d) => (
            <label class="mr-3 inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={domains.has(d)}
                onChange={() => toggle(domains, d, setDomains)}
              />
              <span
                class="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: domainColour(d) }}
              />
              {props.domainLabels[d] ?? d}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend class="mb-1 text-xs tracking-widest text-neutral-500 uppercase">
            {ui.relationshipTypes}
          </legend>
          {Object.keys(props.familyColours).map((f) => (
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                checked={families.has(f)}
                onChange={() => toggle(families, f, setFamilies)}
              />
              <span class="inline-block h-0.5 w-4" style={{ background: props.familyColours[f] }} />
              {props.familyLabels[f] ?? f}
            </label>
          ))}
        </fieldset>

        <div class="space-y-2" data-tour="explorer-route">
          <h2 class="text-xs tracking-widest text-neutral-500 uppercase">{ui.route}</h2>
          <datalist id="atlas-terms">
            {(graph?.nodes ?? []).map((n) => (
              <option value={n.term[lang]} />
            ))}
          </datalist>
          <input
            list="atlas-terms"
            placeholder={ui.from}
            value={from}
            onInput={(e) => setFrom((e.target as HTMLInputElement).value)}
            class="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1"
          />
          <input
            list="atlas-terms"
            placeholder={ui.to}
            value={to}
            onInput={(e) => setTo((e.target as HTMLInputElement).value)}
            class="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1"
          />
          <div class="flex gap-2">
            <button class={button(true)} onClick={findRoute}>
              {ui.findRoute}
            </button>
            <button
              class={button(false)}
              onClick={() => {
                setHighlight([]);
                setRouteMsg('');
              }}
            >
              {ui.clear}
            </button>
          </div>
          {routeMsg && <p class="text-xs text-neutral-300">{routeMsg}</p>}
        </div>

        {sel && (
          <div class="space-y-2 rounded border border-neutral-800 p-3">
            <div class="text-xs tracking-widest uppercase" style={{ color: colourOf(sel) }}>
              {props.clusterLabels[sel.cluster] ?? sel.cluster}
            </div>
            <div class="text-lg font-semibold">{sel.term[lang]}</div>
            {sel.summary && <p class="text-neutral-300">{sel.summary[lang]}</p>}
            <div class="flex flex-wrap gap-2">
              <a class={button(true)} href={`${termBase}${sel.id}/`}>
                {ui.openEntry}
              </a>
              {sel.requires.length > 0 && (
                <button class={button(false)} onClick={() => showPrerequisites(sel.id)}>
                  {ui.showPrerequisites}
                </button>
              )}
            </div>
            <div class="flex flex-wrap gap-2">
              <button class={button(hops === 1)} onClick={() => setHops(1)}>
                {ui.neighbourhood}
              </button>
              {hops !== null && (
                <button class={button(false)} onClick={() => setHops(hops + 1)}>
                  {ui.expand}
                </button>
              )}
              <button class={button(hops === null)} onClick={() => setHops(null)}>
                {ui.wholeMap}
              </button>
            </div>
          </div>
        )}
      </aside>
      <div class="relative min-h-[60vh] flex-1 overflow-hidden bg-[radial-gradient(ellipse_at_center,#11131c_0%,#0a0a0a_75%)]">
        {/* Cytoscape forces its container to position: relative, so it fills a wrapper. */}
        <div class={`absolute inset-0 ${mode === '2d' ? '' : 'invisible'}`}>
          <div ref={box2d} class="h-full w-full">
            {!graph && <p class="p-6 text-neutral-500">{ui.loading}</p>}
          </div>
        </div>
        <div class={`absolute inset-0 ${mode === '3d' ? '' : 'invisible'}`}>
          <div ref={box3d} class="h-full w-full" />
        </div>
        {visible && !sel && (
          <div class="pointer-events-none absolute top-3 right-3 flex flex-col items-end gap-2">
            {mode === '2d' && (
              <div class="flex gap-2">
                <button class={overlayButton} onClick={() => map2d.current?.tidy()}>
                  {props.graphUi.tidy}
                </button>
                <button class={overlayButton} onClick={() => map2d.current?.fit()}>
                  {props.graphUi.fit}
                </button>
              </div>
            )}
            <div class="pointer-events-auto">
              <GraphLegend
                nodes={legendNodes}
                families={Object.keys(props.familyColours).filter((f) => families.has(f))}
                familyColours={props.familyColours}
                familyLabels={props.familyLabels}
                domainLabels={props.domainLabels}
                clusterLabels={props.clusterLabels}
                text={props.graphUi}
                open={legendOpenAtStart()}
                showAll={showAll}
                onShowAll={setShowAll}
              />
            </div>
          </div>
        )}
      </div>
      {graph && sel && (
        <TermPanel
          {...props.panel}
          lang={lang}
          id={sel.id}
          graph={graph}
          termBase={termBase}
          clusterLabels={props.clusterLabels}
          domainLabels={props.domainLabels}
          familyLabels={props.familyLabels}
          graphUi={props.graphUi}
          onSelect={setSelected}
          onClose={closePanel}
        />
      )}
    </div>
  );
}
