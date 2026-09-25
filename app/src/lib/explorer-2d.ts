/**
 * The Explorer's 2D map (A74, A86): one Cytoscape instance for the life of the page.
 * The island layout is computed once from the whole graph; filters only hide and show
 * elements in place, layouts (force / depth / time) and "Tidy up" glide nodes to new
 * positions, and nothing here ever re-creates the instance. Browser-only.
 */
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import type { Graph, GraphNode } from './graph-model';
import { EXPLORER } from './explorer-config';
import {
  LAYOUT_SEED,
  clusterColour,
  cullLabels,
  domainColour,
  homeDomain,
  isDirected,
  labelAbove,
  labelBelow,
  outerSide,
  packIslands,
  withSeededRandom,
  type Island,
  type IslandLink,
  type Point,
} from './graph-style';
import {
  backbone,
  bandGradient,
  bundleControls,
  clusterBundles,
  depthLanes,
  effectiveHome,
  levelAngle,
  pageRank,
  rotateAbout,
  separate,
  sizeForRank,
  timeLanes,
  type LaneLayout,
} from './graph-layout';
import { GRAPH_STYLE, edgeData, reducedMotion, smoothFit, startFlow } from './graph-cytoscape';

cytoscape.use(fcose);

export type Layout = 'force' | 'depth' | 'time';

export type Map2DOptions = {
  container: HTMLElement;
  graph: Graph;
  lang: 'en' | 'da';
  clusterLabels: Record<string, string>;
  domainLabels: Record<string, string>;
  /** Pixels kept clear on the right when fitting (the open legend). */
  reserveRight: () => number;
  /** Pixels on the right covered while a term is selected (the docked term panel). */
  centreReserve: () => number;
  onSelect: (id: string | null) => void;
  onOpen: (id: string) => void;
  /** A term is hovered (e.g. to prefetch its panel data). */
  onHover?: (id: string) => void;
};

/** What the map shows; every field is applied in place. */
export type View = {
  layout: Layout;
  /** Terms shown (domain filter, neighbourhood, time layout's dated terms). */
  nodes: ReadonlySet<string>;
  domains: ReadonlySet<string>;
  families: ReadonlySet<string>;
  showAll: boolean;
  selected: string | null;
  highlight: ReadonlySet<string>;
  colour: (n: GraphNode) => string;
  /** Domain colours of a shared term's split fill; empty for a single-domain term. */
  bands: (n: GraphNode) => string[];
};

/** Below this zoom only hubs keep a (larger) label. */
const FAR_ZOOM = 0.9;
/** Labels smaller than this on screen are not drawn. */
const MIN_LABEL_PX = 8;
const HOVER_LABEL_PX = 11;

const EXTRA_STYLE = [
  { selector: '.gone', style: { display: 'none' } },
  { selector: 'edge.off', style: { display: 'none' } },
  // Resting backbone: the cluster's own shade, no arrow — a calm constellation.
  {
    selector: 'edge.bb',
    style: {
      'line-color': 'data(tint)',
      'target-arrow-shape': 'none',
      'curve-style': 'bezier',
      'control-point-step-size': 30,
    },
  },
  // Revealed (hover, selection, route, "show all"): family colour and arrow.
  {
    selector: 'edge.all, edge.lit, edge.hl, edge.focus',
    style: {
      'line-color': 'data(colour)',
      'target-arrow-color': 'data(colour)',
      'target-arrow-shape': 'data(arrow)',
    },
  },
  { selector: 'edge.all', style: { opacity: EXPLORER.edges.allAlpha } },
  { selector: 'edge.focus', style: { opacity: 0.9, 'z-index': 18 } },
  {
    selector: 'edge.bundle',
    style: {
      width: 'data(width)',
      opacity: 'data(alpha)',
      'line-fill': 'linear-gradient',
      'line-gradient-stop-colors': 'data(gradient)',
      'line-gradient-stop-positions': '0 100',
      'target-arrow-shape': 'none',
      'curve-style': 'unbundled-bezier',
      'control-point-distances': 'data(curve)',
      'control-point-weights': 0.5,
      'line-cap': 'round',
      events: 'no',
      'z-index': 0,
    },
  },
  { selector: 'edge.bundle.faded', style: { opacity: 0.02 } },
  { selector: 'edge.bundle.near', style: { display: 'none' } },
  {
    selector: 'node.anchor',
    style: { width: 1, height: 1, 'background-opacity': 0, label: '', events: 'no' },
  },
  { selector: 'node.far', style: { 'font-size': 'data(farFont)' } },
  { selector: 'node.far[farFont = 0]', style: { 'text-opacity': 0 } },
  { selector: 'node[size]', style: { 'min-zoomed-font-size': 0 } },
  { selector: 'node.nolabel', style: { 'text-opacity': 0 } },
  {
    selector: 'node.far.lit, node.far.sel, node.far.hl',
    style: { 'text-opacity': 1, 'font-size': 'data(hoverFont)' },
  },
  {
    selector: 'node.nolabel.lit, node.nolabel.sel, node.nolabel.hl',
    style: { 'text-opacity': 1 },
  },
  { selector: 'node.hoverhide', style: { 'text-opacity': 0 } },
  {
    selector: 'node.tag',
    style: {
      'background-opacity': 0,
      'border-width': 0,
      'underlay-opacity': 0,
      width: 1,
      height: 1,
      label: 'data(label)',
      color: 'data(colour)',
      'font-size': 'data(font)',
      'font-weight': 600,
      'text-valign': 'data(valign)',
      'text-halign': 'data(halign)',
      'text-opacity': 0.8,
      'text-outline-color': '#0a0a0a',
      'text-outline-width': 3,
      'text-outline-opacity': 0.85,
      'min-zoomed-font-size': 6,
      'z-index': 0,
      events: 'no',
    },
  },
  { selector: 'node.tag.domain', style: { 'text-opacity': 0.45, 'text-outline-width': 0 } },
  { selector: 'node.tag.tick', style: { 'text-opacity': 0.35, 'font-weight': 400 } },
  { selector: 'node.tag.faded', style: { 'text-opacity': 0.08 } },
];

export function createMap2D(opts: Map2DOptions) {
  const { graph, lang } = opts;
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const rank = pageRank(
    graph.nodes.map((n) => n.id),
    graph.links.map((l) => ({ ...l, directed: isDirected(l.type) })),
  );
  const spine = backbone(graph.nodes, graph.links);
  const clusterOf = (id: string) => byId.get(id)?.cluster;
  const bundles = clusterBundles(graph.links, clusterOf, 1);

  const cy = cytoscape({
    container: opts.container,
    elements: [
      ...graph.nodes.map((n) => {
        const r = rank.get(n.id) ?? 0;
        const size = sizeForRank(r);
        return {
          data: {
            id: n.id,
            label: n.term[lang],
            colour: '#888888',
            size,
            font: 8 + Math.round(Math.sqrt(r) * 7),
            farFont: r >= EXPLORER.node.hubShare ? Math.round(14 + Math.sqrt(r) * 12) : 0,
            hoverFont: 15,
          },
        };
      }),
      ...edgeData(
        graph.links,
        (id) => byId.get(id),
        (_, i) => 0.7 + graph.links[i].weight * 0.35,
        EXPLORER.edges.restAlpha,
      ).map((data, i) => {
        const s = byId.get(data.source)!;
        const t = byId.get(data.target)!;
        const cross = s.cluster !== t.cluster;
        return {
          data: { ...data, tint: clusterColour(s.cluster, homeDomain(s)) },
          classes: [spine.has(i) ? 'bb' : '', cross ? 'xc' : ''].join(' '),
        };
      }),
    ],
    style: [...(GRAPH_STYLE as unknown[]), ...EXTRA_STYLE] as cytoscape.StylesheetJson,
    layout: { name: 'preset', fit: false } as cytoscape.LayoutOptions,
    minZoom: 0.08,
    maxZoom: 3,
    autoungrabify: true,
    boxSelectionEnabled: false,
    // Pan and zoom move a snapshot of the map; it is redrawn crisp when they stop (A86).
    textureOnViewport: true,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
  });
  const terms = cy.nodes('[size]');
  const links = cy.edges().not('.bundle');

  // ---- 1. The island map, once, from the whole graph ------------------------------
  const clusters = new Map<string, GraphNode[]>();
  for (const n of graph.nodes) clusters.set(n.cluster, [...(clusters.get(n.cluster) ?? []), n]);
  const clusterIds = [...clusters.keys()].sort();
  /** Each term's offset from its island's centre. */
  const offset = new Map<string, Point>();
  const islandR = new Map<string, number>();
  withSeededRandom(LAYOUT_SEED, () => {
    for (const c of clusterIds) {
      const members = cy.collection(clusters.get(c)!.map((n) => cy.getElementById(n.id)));
      if (members.length > 1)
        members
          .union(members.edgesWith(members))
          .layout({
            name: 'fcose',
            quality: 'default',
            randomize: true,
            animate: false,
            fit: false,
            nodeRepulsion: () => EXPLORER.islands.nodeRepulsion,
            idealEdgeLength: () => EXPLORER.islands.idealEdgeLength,
            edgeElasticity: () => 0.45,
            gravity: 0.6,
            numIter: 1500,
            tile: true,
            tilingPaddingVertical: 24,
            tilingPaddingHorizontal: 24,
            packComponents: true,
            nodeSeparation: 60,
          } as cytoscape.LayoutOptions)
          .run();
      // No two terms closer than a click target and a label apart; the island grows.
      const ps = members.map((m) => ({ ...m.position() }));
      const sizes = members.map((m) => m.data('size') as number);
      const { factor, labelClearance } = EXPLORER.spacing;
      separate(ps, (i, j) => (factor * (sizes[i] + sizes[j])) / 4 + labelClearance);
      const cx = ps.reduce((a, p) => a + p.x, 0) / ps.length;
      const cyy = ps.reduce((a, p) => a + p.y, 0) / ps.length;
      let r = 0;
      members.forEach((m, k) => {
        const o = { x: ps[k].x - cx, y: ps[k].y - cyy };
        offset.set(m.id(), o);
        r = Math.max(r, Math.hypot(o.x, o.y) + m.data('size') / 2);
      });
      islandR.set(c, r + 16);
    }
  });

  /** Pack the given islands (only their visible members count) into domain regions. */
  const islandMap = (visible: ReadonlySet<string>, enabled?: ReadonlySet<string>) => {
    const members = new Map<string, GraphNode[]>();
    for (const c of clusterIds) {
      const mine = clusters.get(c)!.filter((n) => visible.has(n.id));
      if (mine.length) members.set(c, mine);
    }
    const domainOfIsland = new Map<string, string>();
    for (const [c, mine] of members) {
      const votes = new Map<string, number>();
      for (const n of mine) {
        const d = effectiveHome(n, enabled);
        votes.set(d, (votes.get(d) ?? 0) + 1);
      }
      domainOfIsland.set(
        c,
        [...votes.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0],
      );
    }
    const islands: Island[] = [...members.keys()].map((c) => {
      const all = members.get(c)!.length === clusters.get(c)!.length;
      const r = all
        ? islandR.get(c)!
        : Math.max(
            ...members.get(c)!.map((n) => Math.hypot(offset.get(n.id)!.x, offset.get(n.id)!.y)),
          ) + 26;
      return { id: c, domain: domainOfIsland.get(c)!, r };
    });
    const between = new Map<string, number>();
    const add = (a: string, b: string, w: number) => {
      const k = a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
      between.set(k, (between.get(k) ?? 0) + w);
    };
    for (const l of graph.links) {
      if (!visible.has(l.source) || !visible.has(l.target)) continue;
      const a = byId.get(l.source)!.cluster;
      const b = byId.get(l.target)!.cluster;
      if (a !== b) add(a, b, 1);
    }
    const links: IslandLink[] = [...between.entries()].map(([k, w]) => {
      const [a, b] = k.split('\u0000');
      return { a, b, w };
    });
    const packed = packIslands(islands, links);
    const centre = { ...packed.islands };
    // A term sits in its own cluster's island like any other, whatever other domains it
    // also belongs to (A86: no seams — hubs that connect everywhere broke them).
    const positions: Record<string, Point> = {};
    for (const [c, mine] of members)
      for (const n of mine) {
        const o = offset.get(n.id)!;
        positions[n.id] = { x: centre[c].x + o.x, y: centre[c].y + o.y };
      }
    // Lay the map's long axis along the screen's (landscape: horizontal), so it fills it.
    const pts = Object.values(positions);
    const wide = opts.container.clientWidth >= opts.container.clientHeight;
    const turn = levelAngle(pts) + (wide ? 0 : Math.PI / 2);
    const mid = {
      x: pts.reduce((s, p) => s + p.x, 0) / Math.max(1, pts.length),
      y: pts.reduce((s, p) => s + p.y, 0) / Math.max(1, pts.length),
    };
    const level = (p: Point) => rotateAbout(p, mid, turn);
    const regions = Object.fromEntries(
      Object.entries(packed.regions).map(([d, r]) => [d, { ...level(r), r: r.r }]),
    );
    for (const id of Object.keys(positions)) positions[id] = level(positions[id]);
    for (const c of Object.keys(centre)) centre[c] = level(centre[c]);
    return { positions, centre, islands, regions, members };
  };

  const everyone = new Set(graph.nodes.map((n) => n.id));
  // Only the opening layout is computed up front; depth and time are computed on first use
  // and cached, so each whole-graph layout is still computed once and never changes.
  const base = { force: islandMap(everyone) };
  const lanes = new Map<'depth' | 'time', LaneLayout>();
  const fullLanes = (layout: 'depth' | 'time') => {
    if (!lanes.has(layout))
      lanes.set(
        layout,
        layout === 'depth' ? depthLanes(graph.nodes, graph.links) : timeLanes(graph.nodes),
      );
    return lanes.get(layout)!;
  };

  // Anchors (island centres) and the cluster-to-cluster bundles between them.
  cy.add(
    clusterIds.map((c) => ({
      group: 'nodes' as const,
      data: { id: `anc:${c}` },
      position: base.force.centre[c],
      classes: 'anchor',
    })),
  );
  const [wMin, wMax] = EXPLORER.edges.bundleWidth;
  const maxCount = Math.max(1, ...bundles.map((b) => b.count));
  cy.add(
    bundles.map((b, i) => ({
      group: 'edges' as const,
      data: {
        id: `bundle:${i}`,
        source: `anc:${b.a}`,
        target: `anc:${b.b}`,
        a: b.a,
        b: b.b,
        count: b.count,
        width: wMin + (wMax - wMin) * Math.sqrt(b.count / maxCount),
        curve: (i % 2 ? 1 : -1) * 24,
        alpha: 0,
        colour: clusterColour(b.a),
        arrow: 'none',
        gradient: `${clusterColour(b.a)} ${clusterColour(b.b)}`,
      },
      classes: 'bundle',
    })),
  );
  const bundleEdges = cy.edges('.bundle');

  // ---- 2. Tags: cluster and domain names, lane names, depth rows / year ticks ---------
  const tagsFor = (layout: Layout, state: ReturnType<typeof islandMap> | LaneLayout) => {
    const out: cytoscape.ElementDefinition[] = [];
    if (layout === 'force') {
      const s = state as ReturnType<typeof islandMap>;
      for (const isl of s.islands) {
        const mine = s.members.get(isl.id)!;
        if (mine.length < 3) continue;
        const top = Math.min(
          ...mine.map(
            (n) => s.positions[n.id].y - (cy.getElementById(n.id).data('size') as number) / 2,
          ),
        );
        out.push({
          data: {
            id: `tag:c:${isl.id}`,
            label: opts.clusterLabels[isl.id] ?? isl.id,
            colour: clusterColour(isl.id, isl.domain),
            font: 30,
            valign: 'top',
            halign: 'center',
          },
          position: { x: s.centre[isl.id].x, y: top - 8 },
          classes: 'tag',
        });
      }
      const all = Object.values(s.regions);
      const mapCentre = {
        x: all.reduce((a, p) => a + p.x, 0) / all.length,
        y: all.reduce((a, p) => a + p.y, 0) / all.length,
      };
      for (const d of [...new Set(s.islands.map((i) => i.domain))]) {
        const mine = s.islands.filter((i) => i.domain === d);
        const box = {
          x1: Math.min(...mine.map((i) => s.centre[i.id].x - i.r)),
          y1: Math.min(...mine.map((i) => s.centre[i.id].y - i.r)),
          x2: Math.max(...mine.map((i) => s.centre[i.id].x + i.r)),
          y2: Math.max(...mine.map((i) => s.centre[i.id].y + i.r)),
        };
        const midX = (box.x1 + box.x2) / 2;
        const midY = (box.y1 + box.y2) / 2;
        const at = {
          top: { x: midX, y: box.y1 - 30, valign: 'top', halign: 'center' },
          bottom: { x: midX, y: box.y2 + 30, valign: 'bottom', halign: 'center' },
          left: { x: box.x1 - 30, y: midY, valign: 'center', halign: 'left' },
          right: { x: box.x2 + 30, y: midY, valign: 'center', halign: 'right' },
        }[outerSide(box, mapCentre)];
        out.push({
          data: {
            id: `tag:d:${d}`,
            label: opts.domainLabels[d] ?? d,
            colour: domainColour(d),
            font: 96,
            valign: at.valign,
            halign: at.halign,
          },
          position: { x: at.x, y: at.y },
          classes: 'tag domain',
        });
      }
    } else {
      const s = state as LaneLayout;
      for (const l of s.lanes)
        out.push({
          data: {
            id: `tag:l:${l.domain}`,
            label: opts.domainLabels[l.domain] ?? l.domain,
            colour: domainColour(l.domain),
            font: layout === 'depth' ? 44 : 30,
            valign: layout === 'depth' ? 'top' : 'center',
            halign: layout === 'depth' ? 'center' : 'left',
          },
          position: { x: l.x, y: l.y },
          classes: 'tag domain',
        });
      for (const t of s.ticks)
        out.push({
          data: {
            id: `tag:t:${t.label}`,
            label: t.label,
            colour: '#a3a3a3',
            font: 22,
            valign: layout === 'time' ? 'bottom' : 'center',
            halign: layout === 'time' ? 'center' : 'left',
          },
          position: { x: t.x, y: t.y },
          classes: 'tag tick',
        });
    }
    return out;
  };
  const setTags = (defs: cytoscape.ElementDefinition[]) =>
    cy.batch(() => {
      cy.nodes('.tag').remove();
      cy.add(defs.map((d) => ({ ...d, group: 'nodes' as const })));
    });

  // ---- 3. Label cull (A74), over visible terms only ----------------------------------
  const measure = document.createElement('canvas').getContext('2d')!;
  const family = terms.first().style('font-family') as string;
  const textWidth = (text: string, px: number, weight = 'normal') => {
    measure.font = `${weight} ${px}px ${family}`;
    return measure.measureText(text).width;
  };
  const widthCache = new Map<string, number>();
  const labelWidth = (n: cytoscape.NodeSingular, px: number) => {
    const key = `${n.id()}\u0000${px}\u0000${n.data('label')}`;
    if (!widthCache.has(key)) widthCache.set(key, textWidth(n.data('label'), px));
    return widthCache.get(key)!;
  };
  const cull = () => {
    const zoom = cy.zoom();
    const far = zoom < FAR_ZOOM;
    const hoverFont = Math.max(9, Math.round(HOVER_LABEL_PX / zoom));
    if (far && terms.first().data('hoverFont') !== hoverFont) terms.data('hoverFont', hoverFont);
    const fontOf = (n: cytoscape.NodeSingular): number =>
      far ? n.data('farFont') : n.data('font');
    const shown = terms.not('.gone');
    const candidates = shown
      .filter((n) => fontOf(n) > 0 && fontOf(n) * zoom >= MIN_LABEL_PX)
      .sort((a, b) => b.data('size') - a.data('size') || (a.id() < b.id() ? -1 : 1));
    const hidden = cullLabels(
      candidates.map((n) => ({
        id: n.id(),
        ...labelBelow(n.position(), n.data('size'), labelWidth(n, fontOf(n)), fontOf(n)),
      })),
      cy
        .nodes('.tag')
        .not('.gone')
        .filter((t) => t.data('valign') === 'top')
        .map((t) =>
          labelAbove(
            t.position(),
            textWidth(t.data('label'), t.data('font'), '600'),
            t.data('font'),
          ),
        ),
    );
    cy.batch(() => {
      terms.removeClass('nolabel');
      shown.filter((n) => hidden.has(n.id()) || !candidates.contains(n)).addClass('nolabel');
    });
  };
  let cullAt = NaN;
  let cullTimer = 0;
  const recull = (force = false) => {
    const key = cy.zoom() < FAR_ZOOM ? -Math.floor(cy.zoom() * 20) : Math.floor(cy.zoom() * 20);
    if (key === cullAt && !force) return;
    cullAt = key;
    window.clearTimeout(cullTimer);
    cullTimer = window.setTimeout(cull, 120);
  };
  const setFar = () => {
    const far = cy.zoom() < FAR_ZOOM;
    if (far !== terms.first().hasClass('far')) terms.toggleClass('far', far);
    // Bundles are an overview device: zoomed in, the real edges take over.
    if (far === bundleEdges.first().hasClass('near')) bundleEdges.toggleClass('near', !far);
    // Everything else waits until the zoom settles (see `cull`): restyling mid-gesture
    // would throw away the viewport snapshot.
    recull();
  };
  cy.on('zoom viewport', setFar);

  // ---- 4. State, edges and focus ------------------------------------------------------
  let view: View | null = null;
  let tidied = false;
  let hovered: cytoscape.NodeSingular | null = null;
  /** Elements currently displayed — hover fades only these. */
  let shown = cy.collection();

  /** Which edges are drawn, and how (backbone / all / focus). */
  const refreshEdges = () => {
    if (!view) return;
    const v = view;
    const sel = v.selected;
    const hl = v.highlight;
    cy.batch(() => {
      links.forEach((e) => {
        const s = e.data('source');
        const t = e.data('target');
        const ends = v.nodes.has(s) && v.nodes.has(t) && v.families.has(graphFamily(e));
        const focus = ends && (s === sel || t === sel || (hl.has(s) && hl.has(t)));
        const on = ends && (v.showAll || e.hasClass('bb') || focus);
        e.toggleClass('off', !on);
        e.toggleClass('all', on && v.showAll);
        e.toggleClass('focus', focus);
        e.toggleClass('flow', focus && e.data('directed') === 1);
      });
      // Bundles summarise the visible cross-cluster relationships in the force overview.
      const counts = new Map<string, number>();
      if (v.layout === 'force' && !v.showAll)
        links.forEach((e) => {
          if (!e.hasClass('xc')) return;
          const s = e.data('source');
          const t = e.data('target');
          if (!v.nodes.has(s) || !v.nodes.has(t) || !v.families.has(graphFamily(e))) return;
          const a = byId.get(s)!.cluster;
          const b = byId.get(t)!.cluster;
          const k = a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
          counts.set(k, (counts.get(k) ?? 0) + 1);
        });
      const top = Math.max(1, ...counts.values());
      const [aMin, aMax] = EXPLORER.edges.bundleAlpha;
      bundleEdges.forEach((e) => {
        const a = e.data('a');
        const b = e.data('b');
        const c = counts.get(a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`) ?? 0;
        const on = c >= EXPLORER.edges.minBundle;
        e.toggleClass('off', !on);
        if (on) {
          e.data('alpha', aMin + (aMax - aMin) * Math.sqrt(c / top));
          e.data('width', wMin + (wMax - wMin) * Math.sqrt(c / top));
        }
      });
    });
    shown = cy.elements().not('.gone, .off, .anchor');
  };
  const graphFamily = (e: cytoscape.EdgeSingular) => graph.links[Number(e.id().slice(1))].family;

  /** Bundled routes for cross-cluster edges drawn in full ("show all", force layout). */
  let bundled = false;
  const setBundledRoutes = (on: boolean, centre?: Record<string, Point>) => {
    // Clearing routes that were never set restyles every cross-cluster edge for nothing.
    if (!on && !bundled) return;
    bundled = on && !!centre;
    cy.batch(() => {
      links.filter('.xc').forEach((e) => {
        if (!on || !centre) {
          e.removeStyle('curve-style control-point-distances control-point-weights');
          return;
        }
        const s = byId.get(e.data('source'))!;
        const t = byId.get(e.data('target'))!;
        const r = bundleControls(
          e.source().position(),
          e.target().position(),
          centre[s.cluster],
          centre[t.cluster],
        );
        e.style({
          'curve-style': 'unbundled-bezier',
          'control-point-distances': r.distances,
          'control-point-weights': r.weights,
        });
      });
    });
  };

  // ---- 5. Hover: light the neighbourhood, fade the rest (with a little intent) --------
  let hoverTimer = 0;
  const unhover = () => {
    window.clearTimeout(hoverTimer);
    if (!hovered) return;
    const was = hovered;
    hovered = null;
    cy.batch(() => {
      shown.removeClass('faded lit hflow');
      cy.nodes('.hoverhide').removeClass('hoverhide');
      // Edges revealed only for the hover go back to hidden.
      was.connectedEdges('.hoverlink').removeClass('hoverlink').addClass('off');
      cy.nodes('.tag').removeClass('faded');
    });
    opts.container.style.cursor = 'default';
  };
  const hover = (n: cytoscape.NodeSingular) => {
    hovered = n;
    const v = view!;
    const extra = n
      .connectedEdges('.off')
      .filter(
        (e) =>
          v.nodes.has(e.data('source')) &&
          v.nodes.has(e.data('target')) &&
          v.families.has(graphFamily(e)),
      );
    const hood = n.closedNeighborhood().filter((el) => !el.hasClass('off') || extra.contains(el));
    const far = cy.zoom() < FAR_ZOOM;
    const fontOf = (m: cytoscape.NodeSingular): number =>
      far ? m.data('hoverFont') : m.data('font');
    const lit = hood
      .nodes('[size]')
      .sort((a, b) => (a.same(n) ? -1 : b.same(n) ? 1 : b.data('size') - a.data('size')));
    const hidden = cullLabels(
      lit.map((m) => ({
        id: m.id(),
        ...labelBelow(m.position(), m.data('size'), labelWidth(m, fontOf(m)), fontOf(m)),
      })),
    );
    cy.batch(() => {
      extra.removeClass('off').addClass('hoverlink');
      shown.not(hood).addClass('faded');
      cy.nodes('.tag').addClass('faded');
      hood.addClass('lit');
      hood.edges('[?directed]').addClass('hflow');
      lit.filter((m) => hidden.has(m.id())).addClass('hoverhide');
    });
    opts.container.style.cursor = 'pointer';
  };
  cy.on('mouseover', 'node[size]', (e) => {
    const n = e.target as cytoscape.NodeSingular;
    opts.onHover?.(n.id());
    window.clearTimeout(hoverTimer);
    hoverTimer = window.setTimeout(() => {
      if (hovered?.same(n)) return;
      unhover();
      hover(n);
    }, EXPLORER.hoverDelayMs);
  });
  cy.on('mouseout', 'node[size]', unhover);
  cy.on('tap', 'node[size]', (e) => opts.onSelect(e.target.id()));
  cy.on('tap', (e) => e.target === cy && opts.onSelect(null));
  cy.on('dbltap', 'node[size]', (e) => opts.onOpen(e.target.id()));
  const stopFlow = startFlow(cy, 240);

  // ---- 6. Positions ------------------------------------------------------------------
  const targetFor = (v: View, compact: boolean) => {
    if (v.layout === 'force') {
      const s = compact ? islandMap(v.nodes, v.domains) : base.force;
      return { positions: s.positions, tags: tagsFor('force', s), centre: s.centre };
    }
    const subset = graph.nodes.filter((n) => v.nodes.has(n.id));
    const s = !compact
      ? fullLanes(v.layout)
      : v.layout === 'depth'
        ? depthLanes(subset, graph.links, v.domains)
        : timeLanes(subset, v.domains);
    return { positions: s.positions, tags: tagsFor(v.layout, s), centre: undefined };
  };
  let centreNow: Record<string, Point> | undefined = base.force.centre;
  /** Names of disabled domains, and of clusters with nothing left of their own, hide. */
  const refreshTags = (v: View) =>
    cy.batch(() =>
      cy.nodes('.tag').forEach((tag) => {
        const d = /^tag:(?:d|l):(.+)$/.exec(tag.id());
        const c = /^tag:c:(.+)$/.exec(tag.id());
        const gone = d
          ? !v.domains.has(d[1])
          : c
            ? !graph.nodes.some(
                (n) =>
                  n.cluster === c[1] &&
                  v.nodes.has(n.id) &&
                  effectiveHome(n, v.domains) === homeDomain(n),
              )
            : false;
        tag.toggleClass('gone', gone);
      }),
    );
  const place = (v: View, compact: boolean, animate: boolean) => {
    const t = targetFor(v, compact);
    centreNow = t.centre;
    setTags(t.tags);
    refreshTags(v);
    if (t.centre)
      cy.batch(() =>
        clusterIds.forEach(
          (c) => t.centre![c] && cy.getElementById(`anc:${c}`).position(t.centre![c]),
        ),
      );
    const move = terms.filter((n) => !!t.positions[n.id()]);
    const done = () => {
      setBundledRoutes(v.layout === 'force' && v.showAll, t.centre);
      recull(true);
      frame();
    };
    if (!animate || reducedMotion()) {
      cy.batch(() => move.forEach((n) => void n.position(t.positions[n.id()])));
      done();
      return;
    }
    // Straight-line routes bend badly mid-flight; drop them until nodes land.
    setBundledRoutes(false);
    move
      .layout({
        name: 'preset',
        positions: (n: cytoscape.NodeSingular) => t.positions[n.id()],
        animate: true,
        animationDuration: EXPLORER.motion.layoutMs,
        animationEasing: 'ease-in-out-cubic',
        fit: false,
      } as cytoscape.LayoutOptions)
      .one('layoutstop', done)
      .run();
  };
  const fit = () => {
    cy.stop(true);
    smoothFit(cy, 24, 1.1, opts.reserveRight(), shown.nodes().union(cy.nodes('.tag').not('.gone')));
  };
  /** Centre a term in the part of the map the docked panel leaves visible (A80). */
  const centreOn = (id: string, zoomRange: [number, number] = [0, Infinity]) => {
    const node = cy.getElementById(id);
    if (node.empty() || node.hasClass('gone')) return false;
    cy.stop(true);
    const zoom = Math.min(zoomRange[1], Math.max(cy.zoom(), zoomRange[0]));
    const p = node.position();
    const clear = cy.width() - opts.centreReserve();
    cy.animate(
      { zoom, pan: { x: clear / 2 - p.x * zoom, y: cy.height() / 2 - p.y * zoom } },
      { duration: reducedMotion() ? 0 : 400, easing: 'ease-in-out-cubic' },
    );
    return true;
  };
  /**
   * Frame the view after a layout: an explicit selection wins over the fit (a deep link
   * must land centred on its term); a small neighbourhood is fitted whole.
   */
  const frame = () => {
    const sel = view?.selected;
    if (sel && shown.nodes('[size]').length > EXPLORER.islands.minTermsForSystems) {
      if (centreOn(sel, [0.9, 1.2])) return;
    }
    fit();
  };

  // ---- 7. Applying a view ------------------------------------------------------------
  let familiesNow: ReadonlySet<string> | null = null;
  const apply = (next: View) => {
    const prev = view;
    view = next;
    unhover();
    const layoutChanged = !prev || prev.layout !== next.layout;
    const nodesChanged = !prev || prev.nodes !== next.nodes;
    if (layoutChanged || nodesChanged || prev.domains !== next.domains) {
      // Domain toggles hide in place; a tidied map returns to the stable layout.
      const retidy = tidied && !layoutChanged;
      tidied = false;
      cy.batch(() => {
        terms.forEach((n) => void n.toggleClass('gone', !next.nodes.has(n.id())));
        if (layoutChanged)
          terms.forEach((n) => {
            const g = byId.get(n.id())!;
            n.data(
              'label',
              next.layout === 'time' && g.era ? `${g.term[lang]} (${g.era})` : g.term[lang],
            );
          });
      });
      refreshEdges();
      if (layoutChanged || retidy) place(next, false, !!prev);
      else refreshTags(next);
    }
    if (!prev || prev.colour !== next.colour || prev.bands !== next.bands)
      cy.batch(() =>
        terms.forEach((n) => {
          const g = byId.get(n.id())!;
          n.data('colour', next.colour(g));
          const bands = next.bands(g);
          if (bands.length) {
            const b = bandGradient(bands);
            n.data({ bandColours: b.colours, bandStops: b.stops });
          } else if (n.data('bandColours')) n.removeData('bandColours bandStops');
        }),
      );
    // Relationship families fade out / in rather than blink.
    const fading =
      prev && familiesNow && familiesNow !== next.families && !reducedMotion()
        ? links.filter((e) => {
            const f = graphFamily(e);
            return familiesNow!.has(f) && !next.families.has(f) && !e.hasClass('off');
          })
        : cy.collection();
    const familiesOn =
      prev && familiesNow && familiesNow !== next.families && !reducedMotion()
        ? new Set([...next.families].filter((f) => !familiesNow!.has(f)))
        : null;
    familiesNow = next.families;
    const finish = () => {
      const wasOff = familiesOn?.size ? links.filter('.off') : null;
      refreshEdges();
      // …and fade in when switched back on.
      if (wasOff)
        wasOff
          .filter((e) => !e.hasClass('off') && familiesOn!.has(graphFamily(e)))
          .forEach((e) => {
            const target = Number(e.style('opacity'));
            e.style('opacity', 0).animate(
              { style: { opacity: target } },
              {
                duration: EXPLORER.motion.fadeMs,
                complete: () => void e.removeStyle('opacity'),
              },
            );
          });
      if (prev?.showAll !== next.showAll || layoutChanged)
        setBundledRoutes(next.layout === 'force' && next.showAll, centreNow);
      cy.batch(() => {
        cy.elements('.sel, .hl, .dim').removeClass('sel hl dim');
        if (next.highlight.size) {
          shown.addClass('dim');
          terms
            .filter((n) => next.highlight.has(n.id()))
            .removeClass('dim')
            .addClass('hl');
          shown.edges('.focus').removeClass('dim').addClass('hl');
        }
        if (next.selected) cy.getElementById(next.selected).removeClass('dim').addClass('sel');
      });
      if (nodesChanged && !layoutChanged) {
        recull(true);
        frame();
      }
    };
    if (fading.nonempty())
      fading.animate(
        { style: { opacity: 0 } },
        {
          duration: EXPLORER.motion.fadeMs,
          complete: () => {
            fading.removeStyle('opacity');
            finish();
          },
        },
      );
    else finish();
    // A new selection glides into view (layout and filter changes frame it themselves).
    if (next.selected && next.selected !== prev?.selected && !layoutChanged && !nodesChanged)
      centreOn(next.selected);
  };

  return {
    cy,
    apply,
    /** Gather the visible terms into a compact arrangement of the current layout. */
    tidy() {
      if (!view) return;
      tidied = true;
      place(view, true, true);
    },
    fit,
    resize() {
      cy.resize();
    },
    destroy() {
      stopFlow();
      window.clearTimeout(cullTimer);
      window.clearTimeout(hoverTimer);
      cy.destroy();
    },
  };
}

export type Map2D = ReturnType<typeof createMap2D>;
