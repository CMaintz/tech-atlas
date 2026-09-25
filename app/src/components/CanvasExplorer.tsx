import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Graph } from '../lib/graph-model';
import { domainColour, isDirected } from '../lib/graph-style';
import { domainBands, effectivePaint, termVisible } from '../lib/graph-layout';
import {
  HitGrid,
  LAB,
  domainOrder,
  labBackbone,
  labLayout,
  phaseOf,
  project,
  pulseAt,
  radii,
  searchTerms,
  springAtRest,
  springStep,
  type Projected,
} from '../lib/canvas-explorer';
import AboutButton from './AboutButton';
import type { AboutProps } from '../lib/about-assets';
import TermPanel, { prefetchTerm, type PanelConfig } from './TermPanel';
import { termFromSearch, withTermParam } from '../lib/term-panel';
import type { EdgeType } from '../schema';

type Lang = 'en' | 'da';
type Dict = Record<string, string>;
type Mode = 'flat' | 'depth';

interface Props {
  lang: Lang;
  graphUrl: string;
  termBase: string;
  explorerUrl: string;
  ui: Dict;
  clusterLabels: Dict;
  graphUi: Dict;
  familyLabels: Dict;
  familyColours: Dict;
  domainLabels: Dict;
  panel: PanelConfig;
  about: AboutProps;
}

/** The lab's own strings (A91): a hidden test page, so they stay out of site.ts. */
const TEXT: Record<Lang, Dict> = {
  en: {
    title: 'Canvas lab',
    intro:
      'A test page: the same map drawn by a small hand-written canvas renderer, to compare with the Explorer. Not linked from the site.',
    flat: 'Flat',
    depth: 'Depth',
    spin: 'Slow auto-rotate',
    edges: 'Edges',
    backbone: 'Backbone',
    all: 'All',
    search: 'Find a term',
    fit: 'Reset view',
    hintFlat: 'Drag to pan · wheel to zoom · pull a node and let go',
    hintDepth: 'Drag to orbit · Shift+drag to pan · wheel to zoom · pull a node and let go',
    compare: 'Open the Explorer',
    noMatch: 'No match',
    pulses:
      'Moving dots: a one-way relationship, travelling from a term to what it requires, mitigates, causes …',
  },
  da: {
    title: 'Canvas-lab',
    intro:
      'En testside: det samme kort tegnet af en lille håndskrevet canvas-renderer, til sammenligning med Udforskeren. Der linkes ikke hertil fra sitet.',
    flat: 'Flad',
    depth: 'Dybde',
    spin: 'Langsom automatisk rotation',
    edges: 'Kanter',
    backbone: 'Rygrad',
    all: 'Alle',
    search: 'Find et begreb',
    fit: 'Nulstil visning',
    hintFlat: 'Træk for at panorere · hjul for at zoome · træk i en knude og slip',
    hintDepth:
      'Træk for at dreje · Shift+træk for at panorere · hjul for at zoome · træk i en knude og slip',
    compare: 'Åbn Udforskeren',
    noMatch: 'Intet match',
    pulses:
      'Bevægelige prikker: en envejsrelation, der løber fra et begreb mod det, det forudsætter, afbøder, forårsager …',
  },
};

const BG = '#05060b';
/** Room the floating toolbar takes at the top of the map (px); the map centres below it. */
const TOP = 56;
const midY = (h: number) => (h + TOP) / 2;
const panelReserve = () => (window.innerWidth >= 1024 ? 416 : 0);
const reducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A soft radial glow per colour, drawn once and stamped with drawImage. */
const glowCache = new Map<string, HTMLCanvasElement>();
function glowSprite(colour: string): HTMLCanvasElement {
  let c = glowCache.get(colour);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `${colour}aa`);
  grad.addColorStop(0.35, `${colour}44`);
  grad.addColorStop(1, `${colour}00`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  glowCache.set(colour, c);
  return c;
}

/** Everything the draw loop reads; built once per graph, mutated in place. */
type Engine = {
  n: number;
  ids: string[];
  names: string[];
  wx: Float32Array;
  wy: Float32Array;
  wz: Float32Array;
  r: Float32Array;
  rank: Float32Array;
  fill: string[];
  bands: string[][];
  visible: Uint8Array;
  // Per-frame projection.
  sx: Float32Array;
  sy: Float32Array;
  sz: Float32Array;
  dr: Float32Array;
  fog: Float32Array;
  order: Int32Array;
  drawOrder: number[];
  // Elastic drag offsets (screen px) and their velocities.
  ox: Float32Array;
  oy: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  springing: Set<number>;
  // Edges.
  es: Int32Array;
  et: Int32Array;
  efam: string[];
  edir: Uint8Array;
  eback: Uint8Array;
  ephase: Float32Array;
  adj: number[][];
  bound: number;
  span: { w: number; h: number };
  grid: HitGrid;
  famAlpha: Map<string, number>;
};

function buildEngine(graph: Graph): Engine {
  const nodes = graph.nodes;
  const n = nodes.length;
  const index = new Map(nodes.map((nd, i) => [nd.id, i]));
  const rad = radii(nodes, graph.links);
  const pos = labLayout(nodes, graph.links, (id) => rad.get(id)!.r);
  const links = graph.links.filter((l) => index.has(l.source) && index.has(l.target));
  const back = labBackbone(nodes, links);
  const e: Engine = {
    n,
    ids: nodes.map((x) => x.id),
    names: [],
    wx: new Float32Array(n),
    wy: new Float32Array(n),
    wz: new Float32Array(n),
    r: new Float32Array(n),
    rank: new Float32Array(n),
    fill: [],
    bands: [],
    visible: new Uint8Array(n).fill(1),
    sx: new Float32Array(n),
    sy: new Float32Array(n),
    sz: new Float32Array(n),
    dr: new Float32Array(n),
    fog: new Float32Array(n).fill(1),
    order: new Int32Array(n),
    drawOrder: nodes.map((_, i) => i),
    ox: new Float32Array(n),
    oy: new Float32Array(n),
    vx: new Float32Array(n),
    vy: new Float32Array(n),
    springing: new Set(),
    es: new Int32Array(links.map((l) => index.get(l.source)!)),
    et: new Int32Array(links.map((l) => index.get(l.target)!)),
    efam: links.map((l) => l.family),
    edir: new Uint8Array(links.map((l) => (isDirected(l.type as EdgeType) ? 1 : 0))),
    eback: new Uint8Array(links.map((_, i) => (back.has(i) ? 1 : 0))),
    ephase: new Float32Array(links.map((l) => phaseOf(`${l.source}>${l.target}:${l.type}`))),
    adj: nodes.map(() => []),
    bound: 1,
    span: { w: 1, h: 1 },
    grid: new HitGrid(40),
    famAlpha: new Map(),
  };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  nodes.forEach((nd, i) => {
    const p = pos.get(nd.id)!;
    e.wx[i] = p.x;
    e.wy[i] = p.y;
    e.wz[i] = p.z;
    e.r[i] = rad.get(nd.id)!.r;
    e.rank[i] = rad.get(nd.id)!.rank;
    minX = Math.min(minX, p.x - e.r[i]);
    maxX = Math.max(maxX, p.x + e.r[i]);
    minY = Math.min(minY, p.y - e.r[i]);
    maxY = Math.max(maxY, p.y + e.r[i]);
    e.bound = Math.max(e.bound, Math.hypot(p.x, p.y, p.z));
  });
  e.span = { w: maxX - minX, h: maxY - minY };
  links.forEach((_, k) => {
    e.adj[e.es[k]].push(k);
    e.adj[e.et[k]].push(k);
  });
  return e;
}

/**
 * The canvas Explorer lab (A91): one <canvas>, a 2D context and "fake 3D" — every term
 * has x/y/z, projected each frame with yaw/pitch and a simple perspective, drawn back to
 * front. Flat = the front view with pan and zoom; Depth = orbit. One rAF loop that only
 * paints when something changed or is moving. Hidden page for comparison only.
 */
export default function CanvasExplorer(props: Props) {
  const { lang, graphUrl, termBase } = props;
  const t = TEXT[lang];
  const [graph, setGraph] = useState<Graph | null>(null);
  const [mode, setMode] = useState<Mode>('flat');
  const [domains, setDomains] = useState<Set<string>>(new Set());
  const [families, setFamilies] = useState<Set<string>>(new Set(Object.keys(props.familyColours)));
  const [showAll, setShowAll] = useState(false);
  const [spin, setSpin] = useState(() => !reducedMotion());
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  const eng = useRef<Engine | null>(null);
  /** What the loop reads each frame (kept in a ref so the loop is never rebuilt). */
  const view = useRef({
    mode: 'flat' as Mode,
    showAll: false,
    spin: true,
    selected: -1,
    hover: -1,
    families: new Set<string>(),
    reduced: false,
    dirty: true,
  });
  const cam = useRef({
    yaw: 0,
    pitch: 0,
    tyaw: 0,
    tpitch: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    fit: 1,
    focal: Infinity,
    w: 1,
    h: 1,
    dpr: 1,
    cx: 0,
    tcx: 0,
    focus: -1,
    focusUntil: 0,
  });

  useEffect(() => {
    fetch(graphUrl)
      .then((r) => r.json())
      .then((g: Graph) => {
        eng.current = buildEngine(g);
        setDomains(new Set(g.nodes.flatMap((n) => n.domain)));
        setGraph(g);
        const deep = termFromSearch(window.location.search);
        if (deep && g.nodes.some((n) => n.id === deep)) {
          setSelected(deep);
          // Bring the deep-linked term into view, clear of the panel.
          cam.current.focus = eng.current.ids.indexOf(deep);
          cam.current.focusUntil = performance.now() + 1500;
        }
      });
  }, [graphUrl]);

  // The open term is kept in the address (`?term=`), as in the Explorer (A80).
  useEffect(() => {
    if (graph)
      history.replaceState(history.state, '', withTermParam(window.location.href, selected));
  }, [graph, selected]);

  const byId = useMemo(() => new Map((graph?.nodes ?? []).map((n) => [n.id, n])), [graph]);
  const allDomains = useMemo(
    () => domainOrder((graph?.nodes ?? []).flatMap((n) => n.domain)),
    [graph],
  );

  // Push React state into the loop's view.
  useEffect(() => {
    const e = eng.current;
    const v = view.current;
    v.mode = mode;
    v.showAll = showAll;
    v.spin = spin;
    v.families = families;
    v.selected = e && selected ? e.ids.indexOf(selected) : -1;
    v.dirty = true;
    const c = cam.current;
    // Unwind auto-rotation, so going back to Flat never spins through many turns.
    c.yaw = Math.atan2(Math.sin(c.yaw), Math.cos(c.yaw));
    c.tyaw = mode === 'depth' ? 0.55 : 0;
    c.tpitch = mode === 'depth' ? -0.28 : 0;
    c.focal = mode === 'depth' ? LAB.focal : Infinity;
    c.tcx = (c.w - (selected ? panelReserve() : 0)) / 2;
  }, [graph, mode, showAll, spin, families, selected]);

  // Domain filter and colours (split fills per enabled domain).
  useEffect(() => {
    const e = eng.current;
    if (!e || !graph) return;
    graph.nodes.forEach((nd, i) => {
      e.visible[i] = termVisible(nd, domains) ? 1 : 0;
      e.fill[i] = effectivePaint(nd, domains).fill;
      e.bands[i] = domainBands(nd, domains);
      e.names[i] = nd.term[lang];
    });
    view.current.dirty = true;
  }, [graph, domains, lang]);

  // ---- The loop ---------------------------------------------------------------------
  useEffect(() => {
    const el = canvas.current;
    if (!graph || !el || !eng.current) return;
    const e = eng.current;
    const v = view.current;
    const c = cam.current;
    const ctx = el.getContext('2d')!;
    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    v.reduced = !!motionQuery?.matches;
    const onMotion = () => {
      v.reduced = !!motionQuery?.matches;
      v.dirty = true;
    };
    motionQuery?.addEventListener('change', onMotion);
    const textWidth = new Map<string, number>();
    const measure = (font: string, s: string) => {
      const key = `${font}|${s}`;
      let w = textWidth.get(key);
      if (w === undefined) {
        ctx.font = font;
        w = ctx.measureText(s).width;
        textWidth.set(key, w);
      }
      return w;
    };

    const resize = () => {
      const r = el.getBoundingClientRect();
      c.dpr = Math.min(2, window.devicePixelRatio || 1);
      el.width = Math.max(1, Math.round(r.width * c.dpr));
      el.height = Math.max(1, Math.round(r.height * c.dpr));
      c.w = r.width;
      c.h = r.height;
      c.fit = Math.min((r.width * 0.92) / e.span.w, (r.height - TOP - 70) / e.span.h);
      c.tcx = (c.w - (v.selected >= 0 ? panelReserve() : 0)) / 2;
      if (!c.cx) c.cx = c.tcx;
      v.dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const u: Projected = { x: 0, y: 0, z: 0, s: 1 };
    const lit = new Uint8Array(e.n);
    const litEdge = new Uint8Array(e.es.length);
    let last = performance.now();
    let raf = 0;

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let moving = false;
      // Camera easing (mode switch, panel open/close, search focus).
      const ease = 1 - Math.pow(0.001, dt);
      if (v.mode === 'depth' && v.spin && !v.reduced && !drag) {
        c.yaw += dt * 0.06;
        c.tyaw = c.yaw;
        moving = true;
      }
      for (const [k, tk] of [
        ['yaw', 'tyaw'],
        ['pitch', 'tpitch'],
        ['cx', 'tcx'],
      ] as const) {
        const d = c[tk] - c[k];
        if (Math.abs(d) > 1e-4) {
          c[k] = v.reduced ? c[tk] : c[k] + d * ease;
          moving = true;
        }
      }
      // Family toggles fade (no relayout).
      for (const f of Object.keys(props.familyColours)) {
        const target = v.families.has(f) ? 1 : 0;
        const a = e.famAlpha.get(f) ?? target;
        const next = v.reduced ? target : a + (target - a) * Math.min(1, dt * 8);
        const done = Math.abs(target - next) < 0.01 ? target : next;
        if (done !== a) moving = true;
        e.famAlpha.set(f, done);
      }
      // Elastic snap-back of released nodes.
      for (const i of e.springing) {
        [e.ox[i], e.vx[i]] = springStep(e.ox[i], e.vx[i], dt);
        [e.oy[i], e.vy[i]] = springStep(e.oy[i], e.vy[i], dt);
        if (springAtRest(e.ox[i], e.vx[i]) && springAtRest(e.oy[i], e.vy[i])) {
          e.ox[i] = e.oy[i] = e.vx[i] = e.vy[i] = 0;
          e.springing.delete(i);
        }
        moving = true;
      }
      const pulsing = !v.reduced;
      if (!moving && !v.dirty && !pulsing) return;
      v.dirty = false;
      draw(now);
    };

    const draw = (now: number) => {
      const { w, h } = c;
      const cam3 = { yaw: c.yaw, pitch: c.pitch };
      const scale = c.fit * c.zoom * (v.mode === 'depth' ? 0.9 : 1);
      const ox = c.cx + c.panX;
      const oy = midY(h) + c.panY;
      const depth = v.mode === 'depth' || Math.abs(c.yaw) + Math.abs(c.pitch) > 1e-3;
      const focal = depth ? LAB.focal : Infinity;
      for (let i = 0; i < e.n; i++) {
        project({ x: e.wx[i], y: e.wy[i], z: e.wz[i] }, cam3, focal, u);
        e.sx[i] = ox + u.x * scale + e.ox[i];
        e.sy[i] = oy + u.y * scale + e.oy[i];
        e.sz[i] = u.z;
        e.dr[i] = Math.max(1.5, e.r[i] * scale * u.s);
        // Fog: far nodes fade towards the background (Depth only).
        e.fog[i] = depth ? 1 - 0.55 * Math.min(1, Math.max(0, (u.z + e.bound) / (2 * e.bound))) : 1;
      }
      // Search focus: glide the view so the term sits in the middle.
      if (c.focus >= 0) {
        const f = c.focus;
        c.panX += (c.cx - e.sx[f]) * 0.15;
        c.panY += (midY(h) - e.sy[f]) * 0.15;
        if (now > c.focusUntil) c.focus = -1;
        v.dirty = true;
      }
      // Draw order: back to front in Depth; small under big in Flat.
      const ord = e.drawOrder;
      if (depth) ord.sort((a, b) => e.sz[b] - e.sz[a]);
      else ord.sort((a, b) => e.rank[a] - e.rank[b]);
      ord.forEach((i, k) => (e.order[i] = k));

      // Selection: the term, its neighbours and the edges between them are lit.
      const sel = v.selected >= 0 && e.visible[v.selected] ? v.selected : -1;
      lit.fill(0);
      litEdge.fill(0);
      if (sel >= 0) {
        lit[sel] = 1;
        for (const k of e.adj[sel]) {
          if (!v.families.has(e.efam[k])) continue;
          const o = e.es[k] === sel ? e.et[k] : e.es[k];
          if (!e.visible[o]) continue;
          lit[o] = 1;
          litEdge[k] = 1;
        }
      }
      const nodeAlpha = (i: number) => e.fog[i] * (sel < 0 || lit[i] ? 1 : LAB.dimAlpha);

      ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // ---- Edges, batched by family × alpha step × lit ---------------------------
      const batches = new Map<string, number[]>();
      const edgeAlpha = new Float32Array(e.es.length);
      for (let k = 0; k < e.es.length; k++) {
        const a = e.es[k];
        const b = e.et[k];
        if (!e.visible[a] || !e.visible[b]) continue;
        const fa = e.famAlpha.get(e.efam[k]) ?? 1;
        if (fa <= 0.01) continue;
        const hot = litEdge[k] === 1;
        if (!hot && !v.showAll && !e.eback[k]) continue;
        const base = hot ? 0.95 : v.showAll ? 0.2 : 0.38;
        const dim = sel >= 0 && !hot ? LAB.dimAlpha : 1;
        const al = base * dim * fa * Math.min(e.fog[a], e.fog[b]);
        edgeAlpha[k] = al;
        const key = `${e.efam[k]}|${Math.round(al * 12)}|${hot ? 1 : 0}`;
        const list = batches.get(key);
        if (list) list.push(k);
        else batches.set(key, [k]);
      }
      ctx.lineCap = 'round';
      for (const [key, list] of batches) {
        const [fam, step, hot] = key.split('|');
        ctx.globalAlpha = Number(step) / 12;
        ctx.strokeStyle = props.familyColours[fam] ?? '#94a3b8';
        ctx.lineWidth = hot === '1' ? 1.8 : 1;
        ctx.beginPath();
        for (const k of list) {
          ctx.moveTo(e.sx[e.es[k]], e.sy[e.es[k]]);
          ctx.lineTo(e.sx[e.et[k]], e.sy[e.et[k]]);
        }
        ctx.stroke();
      }

      // ---- Pulses along one-way edges: source → target, slow ---------------------
      if (!v.reduced) {
        const dots = new Map<string, number[]>();
        for (const list of batches.values())
          for (const k of list) {
            if (!e.edir[k] || edgeAlpha[k] < 0.05) continue;
            const key = e.efam[k] + (litEdge[k] ? '|1' : sel >= 0 ? '|d' : '|0');
            const l = dots.get(key);
            if (l) l.push(k);
            else dots.set(key, [k]);
          }
        for (const [key, list] of dots) {
          const [fam, state] = key.split('|');
          ctx.globalAlpha = state === '1' ? 1 : state === 'd' ? 0.18 : 0.75;
          ctx.fillStyle = props.familyColours[fam] ?? '#94a3b8';
          const rad = state === '1' ? 2.4 : 1.6;
          ctx.beginPath();
          for (const k of list) {
            const a = e.es[k];
            const b = e.et[k];
            const dx = e.sx[b] - e.sx[a];
            const dy = e.sy[b] - e.sy[a];
            const len = Math.hypot(dx, dy);
            if (len < e.dr[a] + e.dr[b] + 6) continue;
            const f = pulseAt(now, len, e.ephase[k]);
            const x = e.sx[a] + dx * f;
            const y = e.sy[a] + dy * f;
            ctx.moveTo(x + rad, y);
            ctx.arc(x, y, rad, 0, 6.2832);
          }
          ctx.fill();
        }
      }

      // ---- Nodes: glow, solid disc or clean vertical bands, thin outline ---------
      for (const i of ord) {
        if (!e.visible[i]) continue;
        const x = e.sx[i];
        const y = e.sy[i];
        const r = e.dr[i];
        const al = nodeAlpha(i);
        if (x < -r * 3 || x > w + r * 3 || y < -r * 3 || y > h + r * 3) continue;
        const bands = e.bands[i];
        const g = r * 2.6;
        ctx.globalAlpha = al * (sel >= 0 && lit[i] ? 0.8 : 0.45);
        ctx.drawImage(glowSprite(bands.length ? bands[0] : e.fill[i]), x - g, y - g, g * 2, g * 2);
        ctx.globalAlpha = al;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 6.2832);
        if (bands.length < 2) {
          ctx.fillStyle = e.fill[i];
          ctx.fill();
        } else {
          ctx.save();
          ctx.clip();
          const bw = (2 * r) / bands.length;
          bands.forEach((col, k) => {
            ctx.fillStyle = col;
            ctx.fillRect(x - r + k * bw - 0.5, y - r, bw + 1, 2 * r);
          });
          ctx.restore();
        }
        ctx.lineWidth = bands.length > 1 ? 1.2 : 0.8;
        ctx.strokeStyle = bands.length > 1 ? 'rgba(255,255,255,0.75)' : 'rgba(5,6,11,0.55)';
        ctx.stroke();
        if (i === sel || i === v.hover) {
          const pulse = i === sel && !v.reduced ? 1.5 * Math.sin(now / 420) : 0;
          ctx.lineWidth = i === sel ? 2 : 1.4;
          ctx.strokeStyle = i === sel ? '#ffffff' : 'rgba(255,255,255,0.7)';
          ctx.beginPath();
          ctx.arc(x, y, r + 4 + pulse, 0, 6.2832);
          ctx.stroke();
        }
      }

      // ---- Labels: priority order, collision-checked ---------------------------
      const cands: number[] = [];
      for (let i = 0; i < e.n; i++) {
        if (!e.visible[i]) continue;
        if (i === sel || i === v.hover || (sel >= 0 ? lit[i] : e.rank[i] >= LAB.hubShare))
          cands.push(i);
      }
      const pri = (i: number) => (i === sel ? 3 : i === v.hover ? 2 : lit[i] ? 1 : 0);
      cands.sort((a, b) => pri(b) - pri(a) || e.rank[b] - e.rank[a]);
      const placed: number[] = [];
      const free = (x1: number, y1: number, x2: number, y2: number) => {
        if (x1 < 2 || y1 < 2 || x2 > w - 2 || y2 > h - 2) return false;
        for (let p = 0; p < placed.length; p += 4)
          if (x1 < placed[p + 2] && placed[p] < x2 && y1 < placed[p + 3] && placed[p + 1] < y2)
            return false;
        return true;
      };
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.lineJoin = 'round';
      for (const i of cands) {
        const big = i === sel || i === v.hover;
        const size = big ? 13 : 11;
        const font = `${big ? 700 : 600} ${size}px system-ui, sans-serif`;
        const tw = measure(font, e.names[i]);
        const x = e.sx[i];
        let top = e.sy[i] + e.dr[i] + 4;
        if (!free(x - tw / 2 - 3, top - 2, x + tw / 2 + 3, top + size + 3)) {
          top = e.sy[i] - e.dr[i] - 4 - size;
          if (!free(x - tw / 2 - 3, top - 2, x + tw / 2 + 3, top + size + 3) && !big) continue;
        }
        placed.push(x - tw / 2 - 3, top - 2, x + tw / 2 + 3, top + size + 3);
        ctx.font = font;
        ctx.globalAlpha = e.fog[i];
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(5,6,11,0.9)';
        ctx.strokeText(e.names[i], x, top);
        ctx.fillStyle = big ? '#ffffff' : '#d4d4d8';
        ctx.fillText(e.names[i], x, top);
      }
      ctx.globalAlpha = 1;
      e.grid.build(e.sx, e.sy, e.dr, (i) => e.visible[i] === 1);
    };

    // ---- Pointer: grab a node (elastic), orbit / pan the camera, click to select --
    let drag: null | {
      id: number;
      node: number;
      x: number;
      y: number;
      moved: number;
      pan: boolean;
    } = null;
    const local = (ev: PointerEvent | WheelEvent) => {
      const r = el.getBoundingClientRect();
      return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    };
    const hit = (x: number, y: number) => e.grid.nearest(x, y, e.sx, e.sy, e.dr, e.order);
    const onDown = (ev: PointerEvent) => {
      const p = local(ev);
      const node = hit(p.x, p.y);
      drag = {
        id: ev.pointerId,
        node,
        x: ev.clientX,
        y: ev.clientY,
        moved: 0,
        pan: v.mode === 'flat' || ev.shiftKey || ev.button !== 0,
      };
      if (node >= 0) e.springing.delete(node);
      el.setPointerCapture(ev.pointerId);
    };
    const onMove = (ev: PointerEvent) => {
      if (!drag) {
        const p = local(ev);
        const hov = hit(p.x, p.y);
        if (hov !== v.hover) {
          v.hover = hov;
          v.dirty = true;
          el.style.cursor = hov >= 0 ? 'pointer' : v.mode === 'flat' ? 'grab' : 'move';
          if (hov >= 0) prefetchTerm(props.panel.apiBase, e.ids[hov]);
        }
        return;
      }
      const dx = ev.clientX - drag.x;
      const dy = ev.clientY - drag.y;
      drag.x = ev.clientX;
      drag.y = ev.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.moved < 5) return;
      if (drag.node >= 0) {
        e.ox[drag.node] += dx;
        e.oy[drag.node] += dy;
      } else if (drag.pan) {
        c.panX += dx;
        c.panY += dy;
        c.focus = -1;
      } else {
        c.yaw += dx * 0.006;
        c.tyaw = c.yaw;
        c.pitch = Math.max(-1.3, Math.min(1.3, c.pitch + dy * 0.005));
        c.tpitch = c.pitch;
      }
      v.dirty = true;
    };
    const onUp = () => {
      if (!drag) return;
      const { node, moved } = drag;
      drag = null;
      if (moved < 5) {
        setSelected(node >= 0 ? e.ids[node] : null);
        return;
      }
      if (node >= 0) {
        if (v.reduced) {
          e.ox[node] = e.oy[node] = 0;
          v.dirty = true;
        } else {
          e.vx[node] = e.vy[node] = 0;
          e.springing.add(node);
        }
      }
    };
    const onLeave = () => {
      if (v.hover >= 0) {
        v.hover = -1;
        v.dirty = true;
      }
    };
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const p = local(ev);
      const next = Math.min(8, Math.max(0.3, c.zoom * Math.exp(-ev.deltaY * 0.0012)));
      const k = next / c.zoom;
      // Zoom about the pointer: the point under it stays put.
      c.panX = p.x - c.cx - (p.x - c.cx - c.panX) * k;
      c.panY = p.y - h2() - (p.y - h2() - c.panY) * k;
      c.zoom = next;
      v.dirty = true;
    };
    const h2 = () => midY(c.h);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('wheel', onWheel, { passive: false });
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      motionQuery?.removeEventListener('change', onMotion);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('wheel', onWheel);
    };
  }, [graph]);

  const resetView = () => {
    const c = cam.current;
    c.zoom = 1;
    c.panX = c.panY = 0;
    c.focus = -1;
    if (mode === 'depth') {
      c.tyaw = 0.55;
      c.tpitch = -0.28;
    }
    view.current.dirty = true;
  };
  const focusTerm = (id: string) => {
    const e = eng.current;
    if (!e) return;
    const i = e.ids.indexOf(id);
    if (i < 0) return;
    const nd = byId.get(id);
    if (nd && !termVisible(nd, domains)) setDomains(new Set([...domains, ...nd.domain]));
    setSelected(id);
    const c = cam.current;
    c.zoom = Math.max(c.zoom, 1.6);
    c.focus = i;
    c.focusUntil = performance.now() + 900;
    view.current.dirty = true;
  };
  const matches = useMemo(
    () => (graph ? searchTerms(graph.nodes, query, lang) : []),
    [graph, query, lang],
  );
  const toggle = (set: Set<string>, key: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    apply(next);
  };
  const sel = selected ? byId.get(selected) : undefined;
  const closePanel = useCallback(() => setSelected(null), []);
  const [legendOpen, setLegendOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024,
  );
  const pill = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${active ? 'border-neutral-400 bg-neutral-800/80 text-neutral-100' : 'border-neutral-700 text-neutral-500 hover:border-neutral-500'}`;
  const seg = (active: boolean) =>
    `px-2.5 py-0.5 text-xs ${active ? 'bg-neutral-200 text-neutral-900' : 'text-neutral-400 hover:text-neutral-100'}`;
  const bar = 'rounded-lg border border-neutral-800 bg-neutral-950/85 shadow-lg backdrop-blur';
  const splitSample = allDomains
    .slice(0, 2)
    .map((d, i) => `${domainColour(d)} ${i * 50}% ${(i + 1) * 50}%`)
    .join(', ');

  return (
    <div
      class="relative h-[calc(100vh-4.25rem)] overflow-hidden"
      style={{ background: `radial-gradient(ellipse at center, #11131c 0%, ${BG} 75%)` }}
    >
      <h1 class="sr-only">{t.title}</h1>
      {!graph && <p class="p-6 pt-20 text-neutral-500">{props.ui.loading}</p>}
      <canvas
        ref={canvas}
        data-lab-canvas
        class="absolute inset-0 h-full w-full touch-none"
        style={{ cursor: mode === 'flat' ? 'grab' : 'move' }}
        aria-label={t.title}
      />

      {/* Floating toolbar: one slim row over the top of the map (wraps on narrow screens). */}
      <div
        class={`absolute top-3 right-14 left-3 z-10 ${sel ? 'lg:right-[calc(26rem+3.5rem)]' : ''} flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 text-sm ${bar}`}
        data-lab-toolbar
      >
        <span class="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
          {t.title}
        </span>
        <div class="flex overflow-hidden rounded-full border border-neutral-700">
          <button
            class={seg(mode === 'flat')}
            aria-pressed={mode === 'flat'}
            onClick={() => setMode('flat')}
          >
            {t.flat}
          </button>
          <button
            class={seg(mode === 'depth')}
            aria-pressed={mode === 'depth'}
            onClick={() => setMode('depth')}
          >
            {t.depth}
          </button>
        </div>
        {mode === 'depth' && (
          <label class="flex items-center gap-1.5 text-xs text-neutral-300">
            <input type="checkbox" checked={spin} onChange={() => setSpin(!spin)} />
            {t.spin}
          </label>
        )}
        <div class="flex items-center gap-1.5">
          <span class="text-xs text-neutral-500">{t.edges}</span>
          <div class="flex overflow-hidden rounded-full border border-neutral-700">
            <button class={seg(!showAll)} aria-pressed={!showAll} onClick={() => setShowAll(false)}>
              {t.backbone}
            </button>
            <button class={seg(showAll)} aria-pressed={showAll} onClick={() => setShowAll(true)}>
              {t.all}
            </button>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-1.5" role="group" aria-label={props.ui.domains}>
          {allDomains.map((d) => (
            <button
              class={pill(domains.has(d))}
              aria-pressed={domains.has(d)}
              onClick={() => toggle(domains, d, setDomains)}
            >
              <span
                class="inline-block h-2 w-2 rounded-full"
                style={{
                  background: domains.has(d) ? domainColour(d) : 'transparent',
                  boxShadow: `inset 0 0 0 1px ${domainColour(d)}`,
                }}
              />
              {props.domainLabels[d] ?? d}
            </button>
          ))}
        </div>
        <details class="relative">
          <summary
            class={`${pill(families.size === Object.keys(props.familyColours).length)} cursor-pointer list-none`}
          >
            {props.ui.relationshipTypes} ▾
          </summary>
          <div class={`absolute top-full left-0 mt-2 w-64 space-y-1 p-3 ${bar}`}>
            {Object.keys(props.familyColours).map((f) => (
              <label class="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={families.has(f)}
                  onChange={() => toggle(families, f, setFamilies)}
                />
                <span
                  class="inline-block h-0.5 w-4"
                  style={{ background: props.familyColours[f] }}
                />
                {props.familyLabels[f] ?? f}
              </label>
            ))}
          </div>
        </details>
        <div class="relative">
          <input
            type="search"
            placeholder={t.search}
            aria-label={t.search}
            value={query}
            onInput={(ev) => setQuery((ev.target as HTMLInputElement).value)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter' && matches[0]) {
                focusTerm(matches[0].id);
                setQuery('');
              }
              if (ev.key === 'Escape') setQuery('');
            }}
            class="w-44 rounded-full border border-neutral-700 bg-neutral-900 px-3 py-0.5 text-xs"
          />
          {query.trim() && (
            <ul class={`absolute top-full left-0 mt-2 w-60 space-y-0.5 p-2 text-xs ${bar}`}>
              {matches.length === 0 && <li class="px-1 text-neutral-500">{t.noMatch}</li>}
              {matches.map((m) => (
                <li>
                  <button
                    class="w-full rounded px-1 py-0.5 text-left text-neutral-300 hover:bg-neutral-800 hover:text-white"
                    onClick={() => {
                      focusTerm(m.id);
                      setQuery('');
                    }}
                  >
                    {m.term[lang]}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button class={pill(false)} onClick={resetView}>
          {t.fit}
        </button>
        <a class="text-xs text-amber-300 hover:underline" href={props.explorerUrl}>
          {t.compare}
        </a>
      </div>

      {/* Compact legend, bottom-left, collapsible. */}
      <div
        class={`absolute bottom-3 left-3 z-10 sm:left-28 max-w-xs text-xs ${bar}`}
        data-lab-legend
      >
        <button
          class="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-neutral-300"
          aria-expanded={legendOpen}
          onClick={() => setLegendOpen(!legendOpen)}
        >
          {props.graphUi.legend}
          <span aria-hidden="true">{legendOpen ? '▾' : '▸'}</span>
        </button>
        {legendOpen && (
          <div class="space-y-2 border-t border-neutral-800 px-3 py-2 text-neutral-400">
            <div class="flex flex-wrap gap-x-3 gap-y-1">
              {allDomains.map((d) => (
                <span class="inline-flex items-center gap-1">
                  <span
                    class="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: domainColour(d) }}
                  />
                  {props.domainLabels[d] ?? d}
                </span>
              ))}
            </div>
            <div class="flex items-center gap-2">
              <span
                class="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-white/75"
                style={{ background: `linear-gradient(90deg, ${splitSample})` }}
              />
              {props.graphUi.ring}
            </div>
            <div class="flex flex-wrap gap-x-3 gap-y-1">
              {Object.keys(props.familyColours).map((f) => (
                <span class="inline-flex items-center gap-1">
                  <span
                    class="inline-block h-0.5 w-3"
                    style={{ background: props.familyColours[f] }}
                  />
                  {props.familyLabels[f] ?? f}
                </span>
              ))}
            </div>
            <p>{t.pulses}</p>
            <p class="text-neutral-500">{mode === 'flat' ? t.hintFlat : t.hintDepth}</p>
          </div>
        )}
      </div>

      {/* About "i": top-right of the map, moving left of the term panel when it opens. */}
      <div
        class={`absolute top-3 right-3 z-10 transition-[right] duration-300 motion-reduce:transition-none ${sel ? 'lg:right-[calc(26rem+0.75rem)]' : ''}`}
        data-about-corner
      >
        <AboutButton {...props.about} />
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
