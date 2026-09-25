import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import {
  prerequisitesOf,
  shortestPath,
  type Graph,
  type GraphLink,
  type GraphNode,
} from '../lib/graph-model';
import { timePositions } from '../lib/era';
import { loadLearner, type Learner } from '../lib/learner';
import {
  LAYOUT_SEED,
  clusterColour,
  clusterForce,
  curveOffsets,
  domainColour,
  homeDomain,
  idealEdgeLength,
  isDirected,
  nodePaint,
  withSeededRandom,
  clusterSeedPositions,
} from '../lib/graph-style';
import {
  GRAPH_STYLE,
  attachHover,
  edgeData,
  reducedMotion,
  smoothFit,
  startFlow,
} from '../lib/graph-cytoscape';
import GraphLegend from './GraphLegend';

cytoscape.use(fcose);

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
}

type Mode = '2d' | '3d';
type Layout = 'force' | 'depth' | 'time';
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

/** Below this many terms the map is a neighbourhood: no seeded systems, no region names. */
const SYSTEMS_MIN = 60;

/** Above this many one-way edges the whole map stops flowing; only highlights flow. */
const FLOW_ALL_LIMIT = 120;

// 3d-force-graph is large; load it only when 3D is switched on.
type ForceGraphInstance = {
  _destructor: () => void;
  nodeColor: (fn: (n: GraphNode) => string) => ForceGraphInstance;
  linkColor: (fn: (l: GraphLink) => string) => ForceGraphInstance;
  linkDirectionalParticles: (fn: (l: GraphLink) => number) => ForceGraphInstance;
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
  useEffect(() => {
    const refresh = () => setLearner(loadLearner());
    refresh();
    window.addEventListener('atlas:learner', refresh);
    return () => window.removeEventListener('atlas:learner', refresh);
  }, []);
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
    if (colourMode === 'cluster') return nodePaint(n).fill;
    const s = learner.terms[n.id];
    const status = s?.status ?? ((s?.box ?? 0) >= 3 ? 'know' : s?.box ? 'learning' : undefined);
    return status ? KNOWLEDGE_COLOURS[status] : '#404040';
  };
  const hl = useMemo(() => new Set(highlight), [highlight]);
  const selRef = useRef(selected);
  selRef.current = selected;
  const hlRef = useRef(hl);
  hlRef.current = hl;
  /** Hovered node's closed neighbourhood in 3D (ids), or null when nothing is hovered. */
  const hover3d = useRef<Set<string> | null>(null);
  const faded3d = (id: string) =>
    (hover3d.current && !hover3d.current.has(id)) ||
    (!hover3d.current && hlRef.current.size > 0 && !hlRef.current.has(id));
  const colour3d = (n: GraphNode) =>
    n.id === selRef.current ? '#ffffff' : faded3d(n.id) ? 'rgba(64,64,64,0.35)' : colourOf(n);
  // 3d-force-graph replaces link endpoints with node objects once it has run.
  const endId = (x: unknown) => (typeof x === 'string' ? x : (x as { id: string }).id);
  const linkFaded3d = (l: GraphLink) => faded3d(endId(l.source)) || faded3d(endId(l.target));
  const linkColour3d = (l: GraphLink) =>
    linkFaded3d(l) ? 'rgba(82,82,82,0.08)' : props.familyColours[l.family];
  /** The live 3D node-colour accessor (it also fades each node's glow), while 3D is on. */
  const nodeColour3d = useRef<((n: GraphNode) => string) | null>(null);
  const particles3d = (l: GraphLink) =>
    reducedMotion() || !isDirected(l.type) || linkFaded3d(l) ? 0 : 2;

  // ---- 2D (Cytoscape) --------------------------------------------------
  useEffect(() => {
    if (mode !== '2d' || !visible || !container.current) return;
    const maxDegree = Math.max(1, ...visible.nodes.map((n) => n.degree));
    let positions: Record<string, { x: number; y: number }> = {};
    if (layout === 'time') positions = timePositions(visible.nodes);
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
    const force = layout === 'force';
    // The whole map starts from a cluster-aware seed (domains → clusters → terms) and
    // names its systems; a small neighbourhood just gets a clean force layout.
    const systems = force && visible.nodes.length >= SYSTEMS_MIN;
    if (systems) positions = clusterSeedPositions(visible.nodes);
    const nodeOf = (id: string) => byId.get(id);
    const flowAll = visible.links.filter((l) => isDirected(l.type)).length <= FLOW_ALL_LIMIT;
    const cy = cytoscape({
      container: container.current,
      elements: [
        ...visible.nodes.map((n) => {
          const paint = nodePaint(n);
          const share = n.degree / maxDegree;
          return {
            data: {
              id: n.id,
              label: layout === 'time' && n.era ? `${n.term[lang]} (${n.era})` : n.term[lang],
              colour: colourOf(n),
              ring: colourMode === 'cluster' && paint.ring ? paint.ring : undefined,
              size: 12 + share * 30,
              font: 8 + Math.round(share * 6),
              // Zoomed out, only hubs keep a (larger) label, so labels overlap less.
              farFont: share >= 0.4 ? Math.round(14 + share * 12) : 0,
            },
          };
        }),
        ...edgeData(visible.links, nodeOf, (l) => 0.6 + l.weight * 0.45, flowAll ? 0.5 : 0.3).map(
          (data) => ({
            data,
            classes: flowAll && data.directed ? 'flow' : '',
          }),
        ),
      ],
      style: [
        ...(GRAPH_STYLE as unknown[]),
        { selector: 'node.far', style: { 'font-size': 'data(farFont)' } },
        { selector: 'node.far[farFont = 0]', style: { 'text-opacity': 0 } },
        {
          selector: 'node.far.lit, node.far.sel, node.far.hl',
          style: { 'text-opacity': 1, 'font-size': 15 },
        },
        {
          selector: 'node.tag',
          style: {
            'background-opacity': 0,
            'border-width': 0,
            width: 1,
            height: 1,
            label: 'data(label)',
            color: 'data(colour)',
            'font-size': 'data(font)',
            'font-weight': 600,
            'text-valign': 'center',
            'text-halign': 'center',
            'text-opacity': 0.55,
            'text-outline-width': 0,
            'min-zoomed-font-size': 6,
            'z-index': 0,
            events: 'no',
          },
        },
        { selector: 'node.tag.domain', style: { 'text-opacity': 0.12, 'z-index': -1 } },
      ] as cytoscape.StylesheetJson,
      layout: { name: 'preset', positions: (n: cytoscape.NodeSingular) => positions[n.id()] },
      minZoom: 0.1,
      maxZoom: 3,
    });
    if (force) {
      const node = (id: string) => byId.get(id)!;
      withSeededRandom(LAYOUT_SEED, () =>
        cy
          .layout({
            name: 'fcose',
            quality: 'default',
            randomize: !systems,
            animate: false,
            fit: false,
            nodeRepulsion: () => 12000,
            idealEdgeLength: (e: cytoscape.EdgeSingular) =>
              idealEdgeLength(node(e.source().id()), node(e.target().id())),
            edgeElasticity: (e: cytoscape.EdgeSingular) =>
              node(e.source().id()).cluster === node(e.target().id()).cluster ? 0.45 : 0.05,
            gravity: 0.2,
            numIter: 2500,
            tile: true,
            packComponents: true,
            nodeSeparation: 90,
          } as cytoscape.LayoutOptions)
          .run(),
      );
    }
    if (systems) {
      // Name each system at its centre; each domain is a faint watermark over its region.
      const tags: cytoscape.ElementDefinition[] = [];
      const group = (key: (n: GraphNode) => string) => {
        const m = new Map<string, cytoscape.NodeCollection>();
        for (const n of visible.nodes) {
          const k = key(n);
          m.set(k, (m.get(k) ?? cy.collection()).union(cy.getElementById(n.id)));
        }
        return m;
      };
      for (const [c, members] of group((n) => n.cluster)) {
        if (members.length < 3) continue;
        const bb = members.boundingBox();
        const home = homeDomain(byId.get(members[0].id())!);
        tags.push({
          group: 'nodes',
          data: {
            id: `tag:c:${c}`,
            label: props.clusterLabels[c] ?? c,
            colour: clusterColour(c, home),
            font: 22,
          },
          position: { x: (bb.x1 + bb.x2) / 2, y: (bb.y1 + bb.y2) / 2 },
          classes: 'tag',
        });
      }
      for (const [d, members] of group(homeDomain)) {
        const bb = members.boundingBox();
        tags.push({
          group: 'nodes',
          data: {
            id: `tag:d:${d}`,
            label: props.domainLabels[d] ?? d,
            colour: domainColour(d),
            font: 110,
          },
          position: { x: (bb.x1 + bb.x2) / 2, y: (bb.y1 + bb.y2) / 2 },
          classes: 'tag domain',
        });
      }
      cy.add(tags);
    }
    const setFar = () => {
      const far = cy.zoom() < 0.9;
      const nodes = cy.nodes('[size]');
      if (nodes.nonempty() && far !== nodes.first().hasClass('far')) nodes.toggleClass('far', far);
    };
    // `viewport()` (the reduced-motion fit) emits 'viewport', not 'zoom'.
    cy.on('zoom viewport', setFar);
    smoothFit(cy, 40, 1.1, legendReserve());
    setFar();
    cy.on('tap', 'node:childless', (e) => setSelected(e.target.id()));
    cy.on('tap', (e) => e.target === cy && setSelected(null));
    cy.on(
      'dbltap',
      'node:childless',
      (e) => (window.location.href = `${termBase}${e.target.id()}/`),
    );
    attachHover(cy);
    const stopFlow = startFlow(cy);
    cyRef.current = cy;
    return () => {
      stopFlow();
      cy.destroy();
      cyRef.current = null;
    };
  }, [mode, layout, visible, lang, colourMode, learner]);

  // Selection + highlight classes, without re-running the layout.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const flowAll = cy.edges('[?directed]').length <= FLOW_ALL_LIMIT;
    const node = selected ? cy.getElementById(selected) : cy.collection();
    cy.batch(() => {
      cy.elements().removeClass('dim hl sel');
      if (!flowAll) cy.edges().removeClass('flow');
      if (hl.size) {
        cy.elements().not(':parent').addClass('dim');
        cy.nodes()
          .filter((n) => hl.has(n.id()))
          .removeClass('dim')
          .addClass('hl');
        cy.edges()
          .filter((e) => hl.has(e.source().id()) && hl.has(e.target().id()))
          .removeClass('dim')
          .addClass('hl flow');
      }
      // The selected term's one-way relationships flow, even on the whole map.
      node.removeClass('dim').addClass('sel');
      node.connectedEdges('[?directed]').addClass('flow');
      cy.edges('[!directed]').removeClass('flow');
    });
    if (node.nonempty())
      cy.animate(
        { center: { eles: node } },
        { duration: reducedMotion() ? 0 : 400, easing: 'ease-in-out-cubic' },
      );
  }, [selected, hl, visible, mode, layout]);

  // ---- 3D (3d-force-graph) — height is Depth (ADR-0001) ----------------
  useEffect(() => {
    if (mode !== '3d' || !visible || !container.current) return;
    let cancelled = false;
    const el = container.current;
    Promise.all([import('3d-force-graph'), import('three')]).then(
      ([{ default: ForceGraph3D }, THREE]) => {
        if (cancelled) return;
        const nodes = visible.nodes.map((n) => ({ ...n, fy: n.depth * 45 }));
        const links = visible.links.map((l) => ({ ...l }));
        const curves = curveOffsets(links);
        const curveOf = new Map(links.map((l, i) => [l, curves[i]]));
        const neighbours = new Map<string, Set<string>>();
        for (const l of links) {
          for (const [a, b] of [
            [l.source, l.target],
            [l.target, l.source],
          ]) {
            if (!neighbours.has(a)) neighbours.set(a, new Set([a]));
            neighbours.get(a)!.add(b);
          }
        }
        // Dark-theme glow: one soft radial sprite per node, blended additively.
        const glowMap = (() => {
          const c = document.createElement('canvas');
          c.width = c.height = 64;
          const g = c.getContext('2d')!;
          const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
          grad.addColorStop(0, 'rgba(255,255,255,0.9)');
          grad.addColorStop(0.35, 'rgba(255,255,255,0.28)');
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = grad;
          g.fillRect(0, 0, 64, 64);
          return new THREE.CanvasTexture(c);
        })();
        const glows = new Map<string, { material: { opacity: number } }>();
        const nodeColour = (n: GraphNode) => {
          const glow = glows.get(n.id);
          if (glow) glow.material.opacity = faded3d(n.id) ? 0.04 : 0.55;
          return colour3d(n);
        };
        nodeColour3d.current = nodeColour;
        const fg = new ForceGraph3D(el)
          .width(el.clientWidth)
          .height(el.clientHeight)
          .backgroundColor('#07080d')
          .graphData({ nodes, links })
          .nodeLabel((n: GraphNode) => n.term[lang])
          .nodeVal((n: GraphNode) => 1 + n.degree)
          .nodeColor(nodeColour)
          .nodeOpacity(0.95)
          .nodeResolution(16)
          .nodeThreeObjectExtend(true)
          .nodeThreeObject((n: GraphNode) => {
            const r = Math.cbrt(1 + n.degree) * 4;
            const group = new THREE.Group();
            const glow = new THREE.Sprite(
              new THREE.SpriteMaterial({
                map: glowMap,
                color: colourOf(n),
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 0.55,
                depthWrite: false,
              }),
            );
            glow.scale.set(r * 5, r * 5, 1);
            glows.set(n.id, glow);
            group.add(glow);
            // A term in two domains carries a translucent shell in the other domain's colour.
            const ring = colourMode === 'cluster' ? nodePaint(n).ring : null;
            if (ring)
              group.add(
                new THREE.Mesh(
                  new THREE.SphereGeometry(r * 1.45, 16, 12),
                  new THREE.MeshBasicMaterial({
                    color: ring,
                    transparent: true,
                    opacity: 0.25,
                    depthWrite: false,
                  }),
                ),
              );
            return group;
          })
          .linkColor(linkColour3d)
          .linkOpacity(0.5)
          .linkWidth(0.6)
          .linkCurvature((l: GraphLink) => (curveOf.get(l) ?? 16) / 90)
          .linkDirectionalArrowLength((l: GraphLink) => (isDirected(l.type) ? 3.5 : 0))
          .linkDirectionalArrowRelPos(1)
          .linkDirectionalParticles(particles3d)
          .linkDirectionalParticleSpeed(0.006)
          .linkDirectionalParticleWidth(1.4)
          .linkDirectionalParticleColor((l: GraphLink) => props.familyColours[l.family])
          .onNodeHover((n: GraphNode | null) => {
            hover3d.current = n ? (neighbours.get(n.id) ?? new Set([n.id])) : null;
            el.style.cursor = n ? 'pointer' : 'default';
            fg.nodeColor(nodeColour).linkColor(linkColour3d).linkDirectionalParticles(particles3d);
          })
          .onNodeClick((n: GraphNode) => setSelected(n.id));
        // Clusters gather into systems in the horizontal plane; height stays Depth.
        fg.d3Force('cluster', clusterForce(0.12) as never);
        fgRef.current = fg as unknown as ForceGraphInstance;
      },
    );
    return () => {
      cancelled = true;
      nodeColour3d.current = null;
      fgRef.current?._destructor();
      fgRef.current = null;
      el.innerHTML = '';
    };
  }, [mode, visible, lang, colourMode, learner]);

  useEffect(() => {
    fgRef.current
      ?.nodeColor(nodeColour3d.current ?? colour3d)
      .linkColor(linkColour3d)
      .linkDirectionalParticles(particles3d);
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
              <button class={button(layout === 'time')} onClick={() => setLayout('time')}>
                {ui.layoutTime}
              </button>
            </>
          )}
        </div>
        {(mode === '3d' || layout === 'depth') && (
          <p class="text-xs text-neutral-500">{ui.depthNote}</p>
        )}
        {mode === '2d' && layout === 'time' && (
          <p class="text-xs text-neutral-500">{ui.timeNote}</p>
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
      </aside>
      <div class="relative min-h-[60vh] flex-1 overflow-hidden bg-[radial-gradient(ellipse_at_center,#11131c_0%,#0a0a0a_75%)]">
        {/* Cytoscape forces its container to position: relative, so it fills a wrapper. */}
        <div class="absolute inset-0">
          <div ref={container} class="h-full w-full">
            {!graph && <p class="p-6 text-neutral-500">{ui.loading}</p>}
          </div>
        </div>
        {visible && (
          <div class="pointer-events-none absolute top-3 right-3 flex flex-col items-end gap-2">
            {mode === '2d' && (
              <button
                class="pointer-events-auto rounded border border-neutral-700 bg-neutral-950/85 px-2 py-1 text-xs text-neutral-300 hover:border-neutral-500"
                onClick={() => {
                  if (cyRef.current) smoothFit(cyRef.current, 40, 1.1, legendReserve());
                }}
              >
                {props.graphUi.fit}
              </button>
            )}
            <div class="pointer-events-auto">
              <GraphLegend
                nodes={visible.nodes}
                families={Object.keys(props.familyColours).filter((f) => families.has(f))}
                familyColours={props.familyColours}
                familyLabels={props.familyLabels}
                domainLabels={props.domainLabels}
                clusterLabels={props.clusterLabels}
                text={props.graphUi}
                open={legendOpenAtStart()}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
