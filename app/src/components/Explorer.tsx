import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { prerequisitesOf, shortestPath, type Graph, type GraphNode } from '../lib/graph-model';
import { loadLearner, type Learner } from '../lib/learner';
import { domainColour, homeDomain } from '../lib/graph-style';
import { domainBands, effectiveHome, effectivePaint, termVisible } from '../lib/graph-layout';
import { createMap2D, type Layout, type Map2D } from '../lib/explorer-2d';
import type { Map3D } from '../lib/explorer-3d';
import { EXPLORER } from '../lib/explorer-config';
import { searchTerms } from '../lib/canvas-explorer';
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
/** The control bar's popovers; only one is open at a time ('sheet' = phones' Controls). */
type Pop = 'links' | 'route' | 'sheet';
/** A term under a resting pointer, in map pixels (the hover card's anchor). */
type Point = { id: string; x: number; y: number };

/** Personal knowledge map colours (SPEC §9): what you know, and what you don't. */
const KNOWLEDGE_COLOURS: Record<string, string> = {
  know: '#22c55e',
  familiar: '#84cc16',
  learning: '#f59e0b',
  unknown: '#ef4444',
};

/** The legend's open/closed choice is remembered; it starts closed on a first visit. */
const LEGEND_KEY = 'atlas.explorer.legend';
function storedLegendOpen(): boolean {
  try {
    return localStorage.getItem(LEGEND_KEY) === 'open';
  } catch {
    return false;
  }
}
function storeLegendOpen(open: boolean) {
  try {
    localStorage.setItem(LEGEND_KEY, open ? 'open' : 'closed');
  } catch {
    // Storage blocked (private mode): the choice just isn't remembered.
  }
}
/** Pixels the docked term panel covers on the right of the map (lg: 26rem). */
const panelReserve = () => (window.innerWidth >= 1024 ? 416 : 0);
/** Below this width the bar condenses into a "Controls" sheet. */
const NARROW = '(max-width: 767px)';
const media = (q: string) => typeof window !== 'undefined' && window.matchMedia(q).matches;

/**
 * The full-map explorer (SPEC §7, A86). Every node links to a real, statically rendered
 * page: the canvas is an index, not a container. The 2D and 3D maps are each built once
 * and kept; every control below only changes what they show.
 */
export default function Explorer(props: Props) {
  const { lang, graphUrl, termBase, ui } = props;
  const [graph, setGraph] = useState<Graph | null>(null);
  const [mode, setMode] = useState<Mode>('2d');
  const [layout, setLayout] = useState<Layout>('force');
  const [domains, setDomains] = useState<Set<string>>(new Set());
  // Every relationship type starts on except "used with", the densest and least telling.
  const [families, setFamilies] = useState<Set<string>>(
    new Set(Object.keys(props.familyColours).filter((f) => f !== 'association')),
  );
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
  const [spin, setSpin] = useState(false);
  const [pop, setPop] = useState<Pop | null>(null);
  const [query, setQuery] = useState('');
  const [findOpen, setFindOpen] = useState(false);
  const findField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (findOpen) findField.current?.focus();
  }, [findOpen]);
  const [narrow, setNarrow] = useState(() => media(NARROW));
  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const bar = useRef<HTMLDivElement>(null);
  // A popover closes on Esc (focus back on its button) or a press outside the bar. The
  // term panel's Esc handler stands down while a [data-map-popover] is open.
  useEffect(() => {
    if (!pop) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      setPop(null);
      bar.current?.querySelector<HTMLElement>(`[aria-controls="xp-${pop}"]`)?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!bar.current?.contains(e.target as Node)) setPop(null);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown, true);
    };
  }, [pop]);

  // ---- Hover card: a term under a resting mouse pointer (never on touch) ---------------
  const [card, setCard] = useState<Point | null>(null);
  const cardShown = useRef(false);
  const cardTimer = useRef(0);
  const finePointer = useMemo(() => media('(hover: hover) and (pointer: fine)'), []);
  const onPoint = (hit: Point | null) => {
    window.clearTimeout(cardTimer.current);
    if (cardShown.current) {
      cardShown.current = false;
      setCard(null);
    }
    if (!hit || !finePointer) return;
    cardTimer.current = window.setTimeout(() => {
      cardShown.current = true;
      setCard(hit);
    }, EXPLORER.hoverCardMs);
  };
  useEffect(() => () => window.clearTimeout(cardTimer.current), []);
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
  const [legendOpen, setLegendOpen] = useState(storedLegendOpen);
  const legendRef = useRef(legendOpen);
  legendRef.current = legendOpen;
  const onLegendToggle = (open: boolean) => {
    if (open === legendRef.current) return;
    legendRef.current = open;
    setLegendOpen(open);
    storeLegendOpen(open);
  };

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

  /** Terms shown: the domain filter (A86), the time layout's dated terms, a neighbourhood. */
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
        // A selected term shows all its relationships, so its neighbourhood ignores the types.
        if (!ids.has(l.source) || !ids.has(l.target)) continue;
        if (frontier.has(l.source) && !near.has(l.target)) next.add(l.target);
        if (frontier.has(l.target) && !near.has(l.source)) next.add(l.source);
      }
      for (const id of next) near.add(id);
      frontier = next;
    }
    return near;
  }, [graph, domains, mode, layout, hops, hops === null ? null : selected]);

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
      reserveRight: () => (selRef.current ? panelReserve() : 0),
      centreReserve: panelReserve,
      onSelect,
      // A double click opens the panel too — never a page load (A80).
      onOpen: onSelect,
      onHover: (id) => prefetchTerm(props.panel.apiBase, id),
      onPoint,
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
          reserveRight: () => (selRef.current ? panelReserve() : 0),
          onHover: (id) => prefetchTerm(props.panel.apiBase, id),
          onPoint,
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
  useEffect(() => map3d?.spin(spin), [map3d, spin]);
  useEffect(() => {
    onPoint(null);
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
  const clearRoute = () => {
    setHighlight([]);
    setRouteMsg('');
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
  const matches = useMemo(
    () => (graph ? searchTerms(graph.nodes, query, lang) : []),
    [graph, query, lang],
  );
  /** Find a term: make sure it is shown (its domain on, a layout that has it), select it. */
  const findTerm = (id: string) => {
    const n = byId.get(id);
    if (!n) return;
    if (!termVisible(n, domains)) setDomains(new Set([...domains, ...n.domain]));
    if (mode === '2d' && layout === 'time' && n.era === undefined) setLayout('force');
    setSelected(id);
    setQuery('');
    setFindOpen(false);
    setPop(null);
  };

  const sel = selected ? byId.get(selected) : undefined;
  const closePanel = useCallback(() => setSelected(null), []);
  const allDomains = [...new Set((graph?.nodes ?? []).flatMap((n) => n.domain))];
  const allFamilies = Object.keys(props.familyColours);
  // The legend lists only enabled domains; re-homed shared terms wear their domain colour.
  const legendNodes = (visible?.nodes ?? [])
    .filter((n) => effectiveHome(n, domains) === homeDomain(n))
    .map((n) => ({ cluster: n.cluster, domain: n.domain.filter((d) => domains.has(d)) }));

  // Styles after the canvas lab's floating toolbar (the owner's reference).
  const glass =
    'border border-neutral-800 bg-neutral-950/85 shadow-lg shadow-black/40 backdrop-blur';
  const pill = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-300 ${active ? 'border-neutral-400 bg-neutral-800/80 text-neutral-100' : 'border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200'}`;
  const seg = (active: boolean) =>
    `px-2 py-1 text-xs whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber-300 ${active ? 'bg-neutral-200 text-neutral-900' : 'text-neutral-400 hover:text-neutral-100'}`;
  const segGroup = 'flex w-fit shrink-0 overflow-hidden rounded-full border border-neutral-700';
  const field =
    'w-full rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs text-neutral-100 placeholder:text-neutral-500';
  const heading = 'mb-1.5 text-[11px] tracking-widest text-neutral-500 uppercase';
  const act = (active: boolean) =>
    `rounded border px-2 py-1 text-xs focus-visible:outline-2 focus-visible:outline-(--focus) ${active ? 'border-fg-soft text-fg' : 'border-border-strong text-fg-soft hover:border-border-hover hover:text-fg'}`;

  const note =
    mode === '3d'
      ? ui.galaxyNote
      : layout === 'depth'
        ? ui.depthNote
        : layout === 'time'
          ? `${ui.timeNote} ${
              undated === 0
                ? ''
                : undated === 1
                  ? ui.undatedNoteOne
                  : ui.undatedNote.replace('{n}', String(undated))
            }`.trim()
          : '';

  /** A button that opens one of the bar's popovers. */
  const popButton = (key: Pop, label: ComponentChildren, active = false) => (
    <button
      type="button"
      class={pill(active || pop === key)}
      aria-expanded={pop === key}
      aria-controls={`xp-${key}`}
      onClick={() => setPop(pop === key ? null : key)}
    >
      {label} <span aria-hidden="true">▾</span>
    </button>
  );
  /** A popover under its button (desktop); on phones its content sits in the sheet. */
  const popover = (key: Pop, label: string, body: ComponentChildren, align = 'left-0') =>
    pop === key && (
      <div
        id={`xp-${key}`}
        role="group"
        aria-label={label}
        data-map-popover
        class={`absolute top-full ${align} z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl p-3 text-xs text-neutral-300 ${glass}`}
      >
        {body}
      </div>
    );

  const modeSeg = (
    <div class={segGroup} role="group" aria-label={ui.view}>
      <button
        type="button"
        class={seg(mode === '2d')}
        aria-pressed={mode === '2d'}
        onClick={() => setMode('2d')}
      >
        2D
      </button>
      <button
        type="button"
        class={seg(mode === '3d')}
        aria-pressed={mode === '3d'}
        onClick={() => setMode('3d')}
      >
        3D
      </button>
    </div>
  );
  const layoutSeg =
    mode === '2d' ? (
      <div class={segGroup} role="group" aria-label={ui.view}>
        {(
          [
            ['force', ui.layoutForce],
            ['depth', ui.layoutDepth],
            ['time', ui.layoutTime],
          ] as const
        ).map(([l, label]) => (
          <button
            type="button"
            class={seg(layout === l)}
            aria-pressed={layout === l}
            onClick={() => setLayout(l)}
          >
            {label}
          </button>
        ))}
      </div>
    ) : (
      <button type="button" class={pill(spin)} aria-pressed={spin} onClick={() => setSpin(!spin)}>
        <span aria-hidden="true">⟳</span> {ui.autoRotate}
      </button>
    );
  /** Domain toggles: labelled pills in the phone sheet, dot-only chips in the bar. */
  const domainPills = (compact: boolean) => (
    <div
      class={`flex flex-wrap items-center ${compact ? 'gap-1' : 'gap-1.5'}`}
      role="group"
      aria-label={ui.domains}
      data-tour="explorer-filters"
    >
      {allDomains.map((d) => (
        <button
          type="button"
          class={
            compact
              ? `flex h-7 w-7 items-center justify-center rounded-full border focus-visible:outline-2 focus-visible:outline-amber-300 ${domains.has(d) ? 'border-neutral-500 bg-neutral-800/80' : 'border-neutral-700 hover:border-neutral-500'}`
              : pill(domains.has(d))
          }
          aria-pressed={domains.has(d)}
          aria-label={compact ? (props.domainLabels[d] ?? d) : undefined}
          title={compact ? (props.domainLabels[d] ?? d) : undefined}
          onClick={() => toggle(domains, d, setDomains)}
        >
          <span
            class={`inline-block rounded-full ${compact ? 'h-2.5 w-2.5' : 'h-2 w-2'}`}
            style={{
              background: domains.has(d) ? domainColour(d) : 'transparent',
              boxShadow: `inset 0 0 0 1px ${domainColour(d)}`,
            }}
          />
          {!compact && (props.domainLabels[d] ?? d)}
        </button>
      ))}
    </div>
  );
  const colourBody = (
    <div class={segGroup} role="group" aria-label={ui.colourBy}>
      <button
        type="button"
        class={seg(colourMode === 'cluster')}
        aria-pressed={colourMode === 'cluster'}
        onClick={() => setColourMode('cluster')}
      >
        {ui.byCluster}
      </button>
      <button
        type="button"
        class={seg(colourMode === 'knowledge')}
        aria-pressed={colourMode === 'knowledge'}
        onClick={() => setColourMode('knowledge')}
      >
        {ui.byKnowledge}
      </button>
    </div>
  );
  const linksBody = (
    <div class="space-y-1.5">
      <label class="flex items-center gap-2 text-neutral-200">
        <input
          type="checkbox"
          checked={showAll}
          onChange={(e) => setShowAll((e.target as HTMLInputElement).checked)}
        />
        {props.graphUi.showAll}
      </label>
      {!showAll && <p class="text-neutral-500">{props.graphUi.overview}</p>}
      <p class="text-neutral-500">{props.graphUi.typesNote}</p>
      <fieldset class="space-y-1 border-t border-neutral-800 pt-1.5">
        <legend class="sr-only">{ui.relationshipTypes}</legend>
        {allFamilies.map((f) => (
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
    </div>
  );
  const routeBody = (
    <form
      class="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        findRoute();
      }}
    >
      <input
        list="atlas-terms"
        placeholder={ui.from}
        aria-label={ui.from}
        value={from}
        onInput={(e) => setFrom((e.target as HTMLInputElement).value)}
        class={field}
      />
      <input
        list="atlas-terms"
        placeholder={ui.to}
        aria-label={ui.to}
        value={to}
        onInput={(e) => setTo((e.target as HTMLInputElement).value)}
        class={field}
      />
      <div class="flex gap-2">
        <button type="submit" class={pill(true)}>
          {ui.findRoute}
        </button>
        <button type="button" class={pill(false)} onClick={clearRoute}>
          {ui.clear}
        </button>
      </div>
      {routeMsg && (
        <p class="text-neutral-300" aria-live="polite">
          {routeMsg}
        </p>
      )}
    </form>
  );
  // In the bar, "Find a term" is a search icon that opens the field (keeps the bar one row).
  const search =
    !narrow && !findOpen ? (
      <button
        type="button"
        class={`${pill(false)} px-2`}
        aria-label={ui.findTerm}
        title={ui.findTerm}
        onClick={() => setFindOpen(true)}
      >
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      </button>
    ) : (
      <div class="relative">
        <input
          type="search"
          ref={findField}
          onBlur={() => {
            if (!query.trim()) setFindOpen(false);
          }}
          placeholder={ui.findTerm}
          aria-label={ui.findTerm}
          aria-controls="xp-find"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && matches[0]) findTerm(matches[0].id);
            if (e.key === 'Escape' && (query || findOpen)) {
              e.preventDefault();
              if (query) setQuery('');
              else setFindOpen(false);
            }
          }}
          class={`${field} ${narrow ? '' : 'w-40'}`}
        />
        {query.trim() && (
          <ul
            id="xp-find"
            aria-label={ui.findTerm}
            class={`${narrow ? 'mt-2' : `absolute top-full left-0 z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] ${glass}`} space-y-0.5 rounded-xl p-2 text-xs`}
          >
            {matches.length === 0 && <li class="px-1 text-neutral-500">{ui.noResults}</li>}
            {matches.map((m) => (
              <li>
                <button
                  type="button"
                  class="w-full rounded px-1.5 py-1 text-left text-neutral-300 hover:bg-neutral-800 hover:text-white focus-visible:bg-neutral-800"
                  onClick={() => findTerm(m.id)}
                >
                  {m.term[lang]}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );

  // ---- Hover card ------------------------------------------------------------------
  const cardNode = card ? byId.get(card.id) : undefined;
  const cardBox = (() => {
    if (!card || !cardNode) return null;
    const W = 256;
    const w = box2d.current?.clientWidth ?? window.innerWidth;
    const h = box2d.current?.clientHeight ?? window.innerHeight;
    const left = card.x + 18 + W > w ? Math.max(8, card.x - 18 - W) : card.x + 18;
    const top = Math.min(Math.max(8, card.y - 24), h - 160);
    const home = effectiveHome(cardNode, domains);
    return (
      <div
        aria-hidden="true"
        data-hover-card={cardNode.id}
        class={`pointer-events-none absolute z-10 w-64 rounded-xl px-3 py-2 text-xs text-neutral-300 ${glass}`}
        style={{ left, top }}
      >
        <div class="text-sm font-semibold text-neutral-100">{cardNode.term[lang]}</div>
        <div class="mt-1 flex flex-wrap gap-1">
          <span class="inline-flex items-center gap-1 rounded-full border border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-300">
            <span
              class="inline-block h-2 w-2 rounded-full"
              style={{ background: effectivePaint(cardNode, domains).fill }}
            />
            {props.clusterLabels[cardNode.cluster] ?? cardNode.cluster}
          </span>
          <span class="rounded-full border border-neutral-800 px-2 py-0.5 text-[11px] text-neutral-400">
            {props.domainLabels[home] ?? home}
          </span>
        </div>
        {cardNode.summary?.[lang] && (
          <p class="mt-1.5 line-clamp-4 leading-snug text-neutral-400">{cardNode.summary[lang]}</p>
        )}
      </div>
    );
  })();

  return (
    <div class="relative h-[calc(100vh-4.25rem)] overflow-hidden bg-[radial-gradient(ellipse_at_center,#11131c_0%,#0a0a0a_75%)]">
      <h1 class="sr-only">{ui.explorer}</h1>
      <p class="sr-only">{ui.explorerIntro}</p>
      <div
        class="absolute inset-0"
        onPointerDown={() => onPoint(null)}
        onWheel={() => onPoint(null)}
      >
        {/* Cytoscape forces its container to position: relative, so it fills a wrapper. */}
        <div class={`absolute inset-0 ${mode === '2d' ? '' : 'invisible'}`}>
          <div ref={box2d} class="h-full w-full">
            {!graph && <p class="p-6 pt-20 text-neutral-500">{ui.loading}</p>}
          </div>
        </div>
        <div class={`absolute inset-0 ${mode === '3d' ? '' : 'invisible'}`}>
          <div ref={box3d} class="h-full w-full" />
        </div>
      </div>

      <datalist id="atlas-terms">
        {(graph?.nodes ?? []).map((n) => (
          <option value={n.term[lang]} />
        ))}
      </datalist>

      {/*
        The control bar: one compact row (dot-only domain chips, a search icon) centred over
        the top of the map. Equal insets keep it clear of the collapsed legend (top-left,
        also in Danish) and the About "i" (top-right); while the legend is open the bar
        sits right of it. It never moves when the term panel opens, which simply sits above
        it. On phones it condenses to 2D/3D and a "Controls" sheet, and the legend sits
        below it.
      */}
      <div
        class={`pointer-events-none absolute top-3 right-14 left-14 z-20 flex flex-col items-center gap-1.5 md:right-36 ${legendOpen ? 'md:left-[18rem]' : 'md:left-36'}`}
      >
        <div
          ref={bar}
          role="group"
          aria-label={ui.mapControls}
          data-explorer-bar
          class={`pointer-events-auto relative flex max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-1.5 rounded-2xl px-1.5 py-1.5 text-sm ${glass}`}
        >
          <div class="flex items-center gap-1.5" data-tour="explorer-layouts">
            {modeSeg}
            {!narrow && layoutSeg}
          </div>
          {narrow ? (
            <>
              {popButton('sheet', ui.controls)}
              {pop === 'sheet' && (
                <div
                  id="xp-sheet"
                  role="group"
                  aria-label={ui.controls}
                  data-map-popover
                  class={`absolute top-full left-1/2 z-20 mt-2 max-h-[70vh] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 space-y-4 overflow-y-auto rounded-xl p-3 text-xs text-neutral-300 ${glass}`}
                >
                  {search}
                  <div class="flex flex-wrap gap-2">{layoutSeg}</div>
                  {note && <p class="text-neutral-500">{note}</p>}
                  <section>
                    <h2 class={heading}>{ui.colourBy}</h2>
                    {colourBody}
                  </section>
                  <section>
                    <h2 class={heading}>{ui.domains}</h2>
                    {domainPills(false)}
                  </section>
                  <section>
                    <h2 class={heading}>{ui.relationshipTypes}</h2>
                    {linksBody}
                  </section>
                  <section data-tour="explorer-route">
                    <h2 class={heading}>{ui.route}</h2>
                    {routeBody}
                  </section>
                </div>
              )}
            </>
          ) : (
            <>
              {domainPills(true)}
              <div class="relative">
                {popButton('links', ui.linksShort, showAll)}
                {popover('links', ui.relationshipTypes, linksBody)}
              </div>
              {colourBody}
              {search}
              <div class="relative" data-tour="explorer-route">
                {popButton('route', ui.routeShort, highlight.length > 0 && !!routeMsg)}
                {popover('route', ui.route, routeBody, 'right-0')}
              </div>
            </>
          )}
        </div>
        {!narrow && note && (
          <p class="max-w-2xl rounded-full bg-neutral-950/70 px-3 py-0.5 text-center text-[11px] text-neutral-400">
            {note}
          </p>
        )}
      </div>

      {/* The legend: a collapsible box top-left of the map (below the bar on phones). */}
      {visible && (
        <div class="absolute top-16 left-3 z-10 md:top-3" data-explorer-legend>
          <GraphLegend
            nodes={legendNodes}
            families={allFamilies.filter((f) => families.has(f))}
            familyColours={props.familyColours}
            familyLabels={props.familyLabels}
            domainLabels={props.domainLabels}
            clusterLabels={props.clusterLabels}
            text={props.graphUi}
            open={legendOpen}
            onToggle={onLegendToggle}
          />
        </div>
      )}

      {cardBox}

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
          actionsLabel={ui.mapActions}
          actions={
            <>
              {sel.requires.length > 0 && (
                <button type="button" class={act(false)} onClick={() => showPrerequisites(sel.id)}>
                  {ui.showPrerequisites}
                </button>
              )}
              <button
                type="button"
                class={act(hops === 1)}
                aria-pressed={hops === 1}
                onClick={() => setHops(1)}
              >
                {ui.neighbourhood}
              </button>
              {hops !== null && (
                <button type="button" class={act(false)} onClick={() => setHops(hops + 1)}>
                  {ui.expand}
                </button>
              )}
              <button
                type="button"
                class={act(hops === null)}
                aria-pressed={hops === null}
                onClick={() => setHops(null)}
              >
                {ui.wholeMap}
              </button>
            </>
          }
        />
      )}
    </div>
  );
}
