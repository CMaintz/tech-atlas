import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import cytoscape from 'cytoscape';
import {
  prerequisitesOf,
  shortestPath,
  type Graph,
  type GraphLink,
  type GraphNode,
} from '../lib/graph-model';
import { loadLearner, type Learner } from '../lib/learner';

type Lang = 'en' | 'da';
type Dict = Record<string, string>;

interface Props {
  lang: Lang;
  graphUrl: string;
  termBase: string;
  ui: Dict;
  clusterLabels: Dict;
  clusterColours: Dict;
  familyLabels: Dict;
  familyColours: Dict;
  domainLabels: Dict;
}

type Mode = '2d' | '3d';
type Layout = 'force' | 'depth';
type ColourMode = 'cluster' | 'knowledge';

/** Personal knowledge map colours (SPEC §9): what you know, and what you don't. */
const KNOWLEDGE_COLOURS: Record<string, string> = {
  know: '#22c55e',
  familiar: '#84cc16',
  learning: '#f59e0b',
  unknown: '#ef4444',
};

// 3d-force-graph is large; load it only when 3D is switched on.
type ForceGraphInstance = {
  _destructor: () => void;
  nodeColor: (fn: (n: GraphNode) => string) => ForceGraphInstance;
};

/**
 * The full-map explorer (SPEC §7). Every node links to a real, statically rendered
 * page: the canvas is an index, not a container.
 */
export default function Explorer(props: Props) {
  const { lang, graphUrl, termBase, ui } = props;
  const [graph, setGraph] = useState<Graph | null>(null);
  const [mode, setMode] = useState<Mode>('2d');
  const [layout, setLayout] = useState<Layout>('force');
  const [domains, setDomains] = useState<Set<string>>(new Set());
  const [families, setFamilies] = useState<Set<string>>(new Set(Object.keys(props.familyColours)));
  const [selected, setSelected] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [routeMsg, setRouteMsg] = useState('');
  /** Hops shown around the selected term; null = the whole map (SPEC §7: progressive). */
  const [hops, setHops] = useState<number | null>(null);
  const [colourMode, setColourMode] = useState<ColourMode>('cluster');
  const [learner, setLearner] = useState<Learner>({ terms: {} });
  useEffect(() => setLearner(loadLearner()), []);
  const container = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const fgRef = useRef<ForceGraphInstance | null>(null);

  useEffect(() => {
    fetch(graphUrl)
      .then((r) => r.json())
      .then((g: Graph) => {
        setGraph(g);
        setDomains(new Set(g.nodes.flatMap((n) => n.domain)));
        const focus = new URLSearchParams(window.location.search).get('focus');
        const params = new URLSearchParams(window.location.search);
        const a = params.get('from');
        const b = params.get('to');
        const nodeOf = (id: string | null) => g.nodes.find((n) => n.id === id);
        const na = nodeOf(a);
        const nb = nodeOf(b);
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
      });
  }, [graphUrl]);

  const visible = useMemo<Graph | null>(() => {
    if (!graph) return null;
    const nodes = graph.nodes.filter((n) => n.domain.some((d) => domains.has(d)));
    const ids = new Set(nodes.map((n) => n.id));
    const links = graph.links.filter(
      (l) => families.has(l.family) && ids.has(l.source) && ids.has(l.target),
    );
    if (hops === null || !selected || !ids.has(selected)) return { nodes, links };
    // Neighbourhood mode: everything within `hops` relationships of the selected term.
    const near = new Set([selected]);
    let frontier = [selected];
    for (let h = 0; h < hops; h++) {
      const next: string[] = [];
      for (const l of links) {
        for (const [a, b] of [
          [l.source, l.target],
          [l.target, l.source],
        ]) {
          if (frontier.includes(a) && !near.has(b)) {
            near.add(b);
            next.push(b);
          }
        }
      }
      frontier = next;
    }
    return {
      nodes: nodes.filter((n) => near.has(n.id)),
      links: links.filter((l) => near.has(l.source) && near.has(l.target)),
    };
  }, [graph, domains, families, hops, hops === null ? null : selected]);

  const byId = useMemo(() => new Map((graph?.nodes ?? []).map((n) => [n.id, n])), [graph]);
  const nameToId = useMemo(
    () => new Map((graph?.nodes ?? []).map((n) => [n.term[lang].toLowerCase(), n.id])),
    [graph, lang],
  );
  const colourOf = (n: GraphNode) => {
    if (colourMode === 'cluster') return props.clusterColours[n.cluster] ?? '#a3a3a3';
    const s = learner.terms[n.id];
    const status = s?.status ?? ((s?.box ?? 0) >= 3 ? 'know' : s?.box ? 'learning' : undefined);
    return status ? KNOWLEDGE_COLOURS[status] : '#404040';
  };
  const hl = useMemo(() => new Set(highlight), [highlight]);
  const selRef = useRef(selected);
  selRef.current = selected;
  const hlRef = useRef(hl);
  hlRef.current = hl;
  const colour3d = (n: GraphNode) =>
    n.id === selRef.current
      ? '#ffffff'
      : hlRef.current.size && !hlRef.current.has(n.id)
        ? '#262626'
        : colourOf(n);

  // ---- 2D (Cytoscape) --------------------------------------------------
  useEffect(() => {
    if (mode !== '2d' || !visible || !container.current) return;
    const maxDegree = Math.max(1, ...visible.nodes.map((n) => n.degree));
    const positions: Record<string, { x: number; y: number }> = {};
    if (layout === 'depth') {
      const rows = new Map<number, GraphNode[]>();
      for (const n of visible.nodes) rows.set(n.depth, [...(rows.get(n.depth) ?? []), n]);
      for (const [depth, row] of rows) {
        row.sort((a, b) => a.cluster.localeCompare(b.cluster) || a.id.localeCompare(b.id));
        row.forEach((n, i) => {
          positions[n.id] = { x: (i - (row.length - 1) / 2) * 95, y: -depth * 140 };
        });
      }
    }
    const cy = cytoscape({
      container: container.current,
      elements: [
        ...visible.nodes.map((n) => ({
          data: {
            id: n.id,
            label: n.term[lang],
            colour: colourOf(n),
            size: 12 + (n.degree / maxDegree) * 30,
          },
        })),
        ...visible.links.map((l: GraphLink, i) => ({
          data: {
            id: `e${i}`,
            source: l.source,
            target: l.target,
            colour: props.familyColours[l.family],
            width: 0.6 + l.weight * 0.5,
          },
        })),
      ],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(colour)',
            width: 'data(size)',
            height: 'data(size)',
            label: 'data(label)',
            color: '#d4d4d4',
            'font-size': 9,
            'text-valign': 'bottom',
            'text-margin-y': 3,
            'min-zoomed-font-size': 7,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 'data(width)',
            'line-color': 'data(colour)',
            'target-arrow-color': 'data(colour)',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.6,
            'curve-style': 'bezier',
            opacity: 0.5,
          },
        },
        { selector: '.dim', style: { opacity: 0.1 } },
        { selector: 'node.hl', style: { 'border-width': 2, 'border-color': '#ffffff' } },
        { selector: 'edge.hl', style: { opacity: 1, width: 3 } },
        { selector: 'node.sel', style: { 'border-width': 4, 'border-color': '#ffffff' } },
      ] as cytoscape.StylesheetJson,
      layout:
        layout === 'depth'
          ? { name: 'preset', positions: (n: cytoscape.NodeSingular) => positions[n.id()] }
          : ({
              name: 'cose',
              animate: false,
              nodeRepulsion: () => 9000,
              idealEdgeLength: () => 110,
            } as cytoscape.LayoutOptions),
      minZoom: 0.1,
      maxZoom: 3,
    });
    // Small neighbourhoods fit too tightly; keep labels readable.
    if (cy.zoom() > 1.1) {
      cy.zoom(1.1);
      cy.center();
    }
    cy.on('tap', 'node', (e) => setSelected(e.target.id()));
    cy.on('tap', (e) => e.target === cy && setSelected(null));
    cy.on('dbltap', 'node', (e) => (window.location.href = `${termBase}${e.target.id()}/`));
    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [mode, layout, visible, lang, colourMode, learner]);

  // Selection + highlight classes, without re-running the layout.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().removeClass('dim hl sel');
    if (hl.size) {
      cy.elements().addClass('dim');
      cy.nodes()
        .filter((n) => hl.has(n.id()))
        .removeClass('dim')
        .addClass('hl');
      cy.edges()
        .filter((e) => hl.has(e.source().id()) && hl.has(e.target().id()))
        .removeClass('dim')
        .addClass('hl');
    }
    if (selected) {
      const node = cy.getElementById(selected);
      if (node.nonempty()) {
        node.removeClass('dim').addClass('sel');
        cy.animate({ center: { eles: node } }, { duration: 300 });
      }
    }
  }, [selected, hl, visible, mode, layout]);

  // ---- 3D (3d-force-graph) — height is Depth (ADR-0001) ----------------
  useEffect(() => {
    if (mode !== '3d' || !visible || !container.current) return;
    let cancelled = false;
    const el = container.current;
    import('3d-force-graph').then(({ default: ForceGraph3D }) => {
      if (cancelled) return;
      const nodes = visible.nodes.map((n) => ({ ...n, fy: n.depth * 45 }));
      const links = visible.links.map((l) => ({ ...l }));
      const fg = new ForceGraph3D(el)
        .width(el.clientWidth)
        .height(el.clientHeight)
        .backgroundColor('#0a0a0a')
        .graphData({ nodes, links })
        .nodeLabel((n: GraphNode) => n.term[lang])
        .nodeVal((n: GraphNode) => 1 + n.degree)
        .nodeColor(colour3d)
        .linkColor((l: GraphLink) => props.familyColours[l.family])
        .linkOpacity(0.45)
        .linkDirectionalArrowLength(3)
        .linkDirectionalArrowRelPos(1)
        .onNodeClick((n: GraphNode) => setSelected(n.id));
      fgRef.current = fg as unknown as ForceGraphInstance;
    });
    return () => {
      cancelled = true;
      fgRef.current?._destructor();
      fgRef.current = null;
      el.innerHTML = '';
    };
  }, [mode, visible, lang, colourMode, learner]);

  useEffect(() => {
    fgRef.current?.nodeColor(colour3d);
  }, [selected, hl]);

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
  const allDomains = [...new Set((graph?.nodes ?? []).flatMap((n) => n.domain))];
  const button = (active: boolean) =>
    `rounded border px-2 py-1 text-xs ${active ? 'border-neutral-300 text-neutral-100' : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'}`;

  return (
    <div class="flex h-[calc(100vh-4.25rem)] flex-col lg:flex-row">
      <aside class="w-full shrink-0 space-y-5 overflow-y-auto border-neutral-800 p-4 text-sm lg:w-80 lg:border-r">
        <div>
          <h1 class="text-xl font-semibold">{ui.explorer}</h1>
          <p class="mt-1 text-xs text-neutral-500">{ui.explorerIntro}</p>
        </div>

        <div class="flex flex-wrap gap-2">
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
            </>
          )}
        </div>
        {(mode === '3d' || layout === 'depth') && (
          <p class="text-xs text-neutral-500">{ui.depthNote}</p>
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

        <fieldset>
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

        <div class="space-y-2">
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

        <div>
          {Object.entries(props.clusterLabels).map(([c, label]) => (
            <div class="flex items-center gap-2 text-xs text-neutral-400">
              <span
                class="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: props.clusterColours[c] }}
              />
              {label}
            </div>
          ))}
        </div>
      </aside>
      <div ref={container} class="relative min-h-[60vh] flex-1 bg-neutral-950">
        {!graph && <p class="p-6 text-neutral-500">{ui.loading}</p>}
      </div>
    </div>
  );
}
