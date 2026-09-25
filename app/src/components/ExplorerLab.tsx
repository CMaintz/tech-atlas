import type { ComponentChildren, ComponentProps } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type cytoscape from 'cytoscape';
import Explorer from './Explorer';
import type { Map2D } from '../lib/explorer-2d';
import type { Map3D } from '../lib/explorer-3d';
import type { Graph } from '../lib/graph-model';
import type { EdgeType } from '../schema';
import { EXPLORER } from '../lib/explorer-config';
import { FADE_TRANSITIONS, attachHover } from '../lib/graph-cytoscape';
import {
  FAMILY_COLOURS,
  FLOW_DASH,
  domainColour,
  homeDomain,
  isDirected,
} from '../lib/graph-style';
import {
  DEFAULT_2D,
  DEFAULT_3D,
  averageFps,
  changed,
  frameStats,
  fromQuery,
  rules2D,
  type Lab2D,
  type Lab3D,
} from '../lib/explorer-lab';

type Props = Omit<ComponentProps<typeof Explorer>, 'lab'> & { view: '2d' | '3d' };
type Maps = { map2d: Map2D | null; map3d: Map3D | null };

const BENCH_MS = 5000;
/** Frames the meter keeps (the last five seconds). */
const WINDOW_MS = 5000;

const TEXT = {
  en: {
    title: 'Visual lab',
    hide: 'Hide',
    show: 'Show lab',
    meter: 'Frame meter',
    fps: 'fps',
    low: '1% low',
    longest: 'longest',
    bench: 'Benchmark (5 s)',
    running: 'Running…',
    benchPan: 'Scripted pan and zoom',
    benchOrbit: 'Scripted orbit',
    average: 'average',
    active: 'Active',
    defaults: 'all defaults (today)',
    curve: 'Edge curve',
    haystack: 'Straight (haystack, today)',
    bezier: 'Bezier',
    unbundled: 'Curved (unbundled bezier)',
    strength: 'Curve strength',
    gradient: 'Gradient edges (domain to domain)',
    flow: 'One-way flow',
    dots: 'Overlay dots (today)',
    dashes: 'Marching dashes (old)',
    none: 'None',
    speed: 'Flow speed',
    hover: 'Hover restyle',
    hoverNow: 'Visible map (today)',
    hoverOld: 'Every element, with fades (old)',
    glow: 'Node glow',
    all: 'Show all relationships',
    labels: 'Labels',
    labelsNone: 'None',
    labelsHubs: 'Hubs only',
    labelsNow: 'Culled (today)',
    labelsAll: 'All (overlapping)',
    texture: 'Snapshot while panning (today)',
    textureNote: 'The benchmark moves the view directly, so it always draws full frames.',
    links: 'Link geometry',
    lines: 'Merged lines (today)',
    tubes: 'Tube and cone per link (old)',
    curvature: 'Link curvature',
    comets: 'Comets (today)',
    particles: 'Per-link particles (old)',
    glow3: 'Glow',
    cloud: 'Point cloud (today)',
    sprites: 'Sprite per term (old)',
    bloom: 'Bloom',
    spin: 'Auto-rotate',
    fog: 'Fog',
    spacing: 'Node spacing',
  },
  da: {
    title: 'Visuelt laboratorium',
    hide: 'Skjul',
    show: 'Vis lab',
    meter: 'Billedmåler',
    fps: 'fps',
    low: '1% lav',
    longest: 'længste',
    bench: 'Benchmark (5 s)',
    running: 'Kører…',
    benchPan: 'Scriptet panorering og zoom',
    benchOrbit: 'Scriptet kredsløb',
    average: 'gennemsnit',
    active: 'Aktive',
    defaults: 'alle standarder (i dag)',
    curve: 'Kantkurve',
    haystack: 'Lige (haystack, i dag)',
    bezier: 'Bezier',
    unbundled: 'Buet (unbundled bezier)',
    strength: 'Kurvestyrke',
    gradient: 'Gradientkanter (domæne til domæne)',
    flow: 'Envejsflow',
    dots: 'Prikker i overlag (i dag)',
    dashes: 'Marcherende streger (gammel)',
    none: 'Ingen',
    speed: 'Flowhastighed',
    hover: 'Hover-omstil',
    hoverNow: 'Synligt kort (i dag)',
    hoverOld: 'Alle elementer, med toninger (gammel)',
    glow: 'Nodeglød',
    all: 'Vis alle relationer',
    labels: 'Etiketter',
    labelsNone: 'Ingen',
    labelsHubs: 'Kun knudepunkter',
    labelsNow: 'Udtyndet (i dag)',
    labelsAll: 'Alle (overlappende)',
    texture: 'Øjebliksbillede under panorering (i dag)',
    textureNote: 'Benchmarken flytter visningen direkte, så den tegner altid hele billeder.',
    links: 'Forbindelsesgeometri',
    lines: 'Samlede linjer (i dag)',
    tubes: 'Rør og kegle pr. forbindelse (gammel)',
    curvature: 'Forbindelseskrumning',
    comets: 'Kometer (i dag)',
    particles: 'Partikler pr. forbindelse (gammel)',
    glow3: 'Glød',
    cloud: 'Punktsky (i dag)',
    sprites: 'Sprite pr. begreb (gammel)',
    bloom: 'Bloom',
    spin: 'Autorotation',
    fog: 'Tåge',
    spacing: 'Nodeafstand',
  },
};
type Text = (typeof TEXT)['en'];

const CHOICES_2D = {
  curve: ['haystack', 'bezier', 'unbundled'],
  flow: ['dots', 'dashes', 'none'],
  hover: ['current', 'old'],
  labels: ['none', 'hubs', 'current', 'all'],
} as const;
const CHOICES_3D = {
  links: ['lines', 'tubes'],
  flow: ['comets', 'particles', 'none'],
  glow: ['cloud', 'sprites'],
} as const;

/**
 * The hidden visual lab (A95): the real Explorer, plus a floating panel that swaps in
 * old visual effects live (restyle, never relayout), a frame meter and a scripted
 * benchmark. Toggles start from the address (`?curve=bezier&bench=1`); nothing is stored.
 */
export default function ExplorerLab(props: Props) {
  const { view, lang } = props;
  const t = TEXT[lang];
  const [s2, setS2] = useState<Lab2D>(() =>
    fromQuery(window.location.search, DEFAULT_2D, CHOICES_2D),
  );
  const [s3, setS3] = useState<Lab3D>(() =>
    fromQuery(window.location.search, DEFAULT_3D, CHOICES_3D),
  );
  const [maps, setMaps] = useState<Maps>({ map2d: null, map3d: null });
  const [open, setOpen] = useState(true);
  const [result, setResult] = useState<string>('');
  const [running, setRunning] = useState(false);
  const active = view === '2d' ? changed(s2, DEFAULT_2D) : changed(s3, DEFAULT_3D);

  // ---- Frame meter: every animation frame's timestamp over the last five seconds ------
  const meter = useRef<HTMLParagraphElement>(null);
  const frames = useRef<number[]>([]);
  const bench = useRef<number[] | null>(null);
  useEffect(() => {
    let raf = 0;
    let shown = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const f = frames.current;
      f.push(now);
      while (f.length && f[0] < now - WINDOW_MS) f.shift();
      bench.current?.push(now);
      if (now - shown < 250 || !meter.current) return;
      shown = now;
      const st = frameStats(f);
      meter.current.textContent = `${st.fps} ${t.fps} · ${t.low} ${st.low} · ${t.longest} ${st.longest} ms`;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [t]);

  // ---- The graph (for domain colours) -------------------------------------------------
  const [graph, setGraph] = useState<Graph | null>(null);
  useEffect(() => {
    fetch(props.graphUrl)
      .then((r) => r.json())
      .then(setGraph);
  }, [props.graphUrl]);

  // ---- 2D: stylesheet rules over the Explorer's own, flow and hover variants ----------
  const base2d = useRef<unknown[] | null>(null);
  const cy = maps.map2d?.cy;
  useEffect(() => {
    if (!cy || !graph) return;
    base2d.current = (cy.style() as unknown as { json(): unknown[] }).json();
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    const colour = (id: string) => {
      const n = byId.get(id);
      return n ? domainColour(homeDomain(n)) : '#888888';
    };
    cy.batch(() =>
      cy
        .edges()
        .not('.bundle')
        .forEach((e) => {
          e.data('labGradient', `${colour(e.data('source'))} ${colour(e.data('target'))}`);
          e.data('labCurve', e.data('curve'));
        }),
    );
  }, [cy, graph]);

  useEffect(() => {
    const m = maps.map2d;
    if (!m || !cy || !base2d.current || view !== '2d') return;
    cy.batch(() =>
      cy
        .edges()
        .not('.bundle')
        .forEach((e) => void e.data('labCurve', Number(e.data('curve')) * s2.strength)),
    );
    const extra = [...rules2D(s2, FLOW_DASH)];
    if (s2.hover === 'old') extra.push(...(FADE_TRANSITIONS as unknown as typeof extra));
    cy.style()
      .fromJson([...base2d.current, ...extra] as cytoscape.StylesheetJson)
      .update();
    m.lab.setDots(s2.flow === 'dots');
    m.lab.dots.speed = EXPLORER.dots.speed * s2.speed;
    (cy as unknown as { renderer(): { textureOnViewport: boolean } }).renderer().textureOnViewport =
      s2.texture;
  }, [maps, cy, graph, s2, view]);

  // The old hover: every element restyled on each hover (graph-cytoscape `attachHover`).
  useEffect(() => {
    if (!cy || s2.hover !== 'old') return;
    attachHover(cy);
    return () => {
      cy.removeListener('mouseover', 'node:childless');
      cy.removeListener('mouseout', 'node:childless');
      cy.elements().removeClass('hflow');
    };
  }, [cy, s2.hover]);

  // The old flow: every visible one-way edge dashed, the dash offset restyled each tick.
  useEffect(() => {
    if (!cy || s2.flow !== 'dashes') return;
    const directed = cy.edges('[?directed]').not('.bundle');
    directed.addClass('labflow');
    const cfg = EXPLORER.flow;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 1000 / cfg.fps) return;
      last = now;
      const offset = -(((now / 1000) * cfg.speed * s2.speed) % (cfg.dash[0] + cfg.dash[1]));
      directed.not('.off').style('line-dash-offset', offset);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      directed.removeClass('labflow').removeStyle('line-dash-offset');
    };
  }, [cy, s2.flow, s2.speed]);

  // ---- 3D ------------------------------------------------------------------------------
  const three = useRef<Lab3DRuntime | null>(null);
  useEffect(() => {
    const m = maps.map3d;
    if (!m) return;
    let cancelled = false;
    void setup3D(m).then((rt) => {
      if (cancelled) return rt.dispose();
      three.current = rt;
      rt.apply(s3);
    });
    return () => {
      cancelled = true;
      three.current?.dispose();
      three.current = null;
    };
  }, [maps.map3d]);
  useEffect(() => three.current?.apply(s3), [s3]);

  // ---- Benchmark ------------------------------------------------------------------------
  const runBench = () => {
    if (running) return;
    const move = view === '2d' ? cy && panZoom(cy) : maps.map3d && orbit(maps.map3d);
    if (!move) return;
    setRunning(true);
    setResult('');
    bench.current = [];
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / BENCH_MS);
      move.at(k);
      if (k < 1) return void requestAnimationFrame(step);
      move.done();
      const times = bench.current ?? [];
      bench.current = null;
      const st = frameStats(times);
      const out = {
        view,
        fps: averageFps(times),
        low: st.low,
        longest: st.longest,
        toggles: active.join(' ') || 'defaults',
      };
      setResult(JSON.stringify(out));
      setRunning(false);
    };
    requestAnimationFrame(step);
  };
  // `?bench=1` runs the benchmark once the map has settled (for headless runs).
  const autoBench = useRef(new URLSearchParams(window.location.search).get('bench') === '1');
  const ready = view === '2d' ? !!cy && !!graph : !!maps.map3d;
  useEffect(() => {
    if (!ready || !autoBench.current) return;
    autoBench.current = false;
    const id = window.setTimeout(runBench, view === '2d' ? 3000 : 4000);
    return () => window.clearTimeout(id);
  }, [ready]);

  // ---- Panel ------------------------------------------------------------------------------
  const res = result ? (JSON.parse(result) as { fps: number; low: number; longest: number }) : null;
  const all = view === '2d' ? s2.all : s3.all;
  return (
    <>
      <Explorer {...props} lab={{ mode: view, showAll: all, onMaps: (m) => setMaps({ ...m }) }} />
      <div
        class="absolute right-3 bottom-3 z-30 w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border border-neutral-800 bg-neutral-950/90 p-3 text-xs text-neutral-300 shadow-lg shadow-black/40 backdrop-blur"
        role="group"
        aria-label={t.title}
        data-lab-panel
      >
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-[11px] tracking-widest text-neutral-400 uppercase">
            {t.title} · {view.toUpperCase()}
          </h2>
          <button
            type="button"
            class="rounded-full border border-neutral-700 px-2 py-0.5 text-neutral-400 hover:text-neutral-100"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? t.hide : t.show}
          </button>
        </div>
        <p class="mt-1.5 font-mono text-neutral-100" ref={meter} aria-label={t.meter}>
          -
        </p>
        <div class="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            class="rounded-full border border-neutral-500 bg-neutral-800/80 px-2.5 py-1 text-neutral-100 disabled:opacity-50"
            disabled={running || !ready}
            title={view === '2d' ? t.benchPan : t.benchOrbit}
            onClick={runBench}
          >
            {running ? t.running : t.bench}
          </button>
          {res && (
            <span class="font-mono text-amber-200" data-lab-result={result}>
              {res.fps} {t.fps} {t.average} · {t.low} {res.low}
            </span>
          )}
        </div>
        <p class="mt-1.5 text-neutral-500">
          {t.active}: <span class="text-neutral-300">{active.join(', ') || t.defaults}</span>
        </p>
        {open && (
          <div class="mt-2 max-h-[50vh] space-y-2 overflow-y-auto border-t border-neutral-800 pt-2">
            {view === '2d' ? (
              <Controls2D s={s2} set={setS2} t={t} />
            ) : (
              <Controls3D s={s3} set={setS3} t={t} />
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ---- Controls ------------------------------------------------------------------------

function Row(p: { label: string; children: ComponentChildren }) {
  return (
    <label class="flex items-center justify-between gap-2">
      <span>{p.label}</span>
      {p.children}
    </label>
  );
}
function Pick<T extends string>(p: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  on: (v: T) => void;
}) {
  return (
    <Row label={p.label}>
      <select
        class="max-w-40 rounded border border-neutral-700 bg-neutral-900 px-1 py-0.5 text-neutral-100"
        value={p.value}
        onChange={(e) => p.on((e.target as HTMLSelectElement).value as T)}
      >
        {p.options.map(([v, l]) => (
          <option value={v}>{l}</option>
        ))}
      </select>
    </Row>
  );
}
function Check(p: { label: string; value: boolean; on: (v: boolean) => void }) {
  return (
    <label class="flex items-center gap-2">
      <input
        type="checkbox"
        checked={p.value}
        onChange={(e) => p.on((e.target as HTMLInputElement).checked)}
      />
      {p.label}
    </label>
  );
}
function Slide(p: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  on: (v: number) => void;
}) {
  return (
    <Row label={`${p.label} ${p.value.toFixed(2)}`}>
      <input
        type="range"
        class="w-28"
        min={p.min}
        max={p.max}
        step={p.step}
        value={p.value}
        onInput={(e) => p.on(Number((e.target as HTMLInputElement).value))}
      />
    </Row>
  );
}

function Controls2D(p: { s: Lab2D; set: (s: Lab2D) => void; t: Text }) {
  const { s, t } = p;
  const up =
    <K extends keyof Lab2D>(k: K) =>
    (v: Lab2D[K]) =>
      p.set({ ...s, [k]: v });
  return (
    <>
      <Pick
        label={t.curve}
        value={s.curve}
        options={[
          ['haystack', t.haystack],
          ['bezier', t.bezier],
          ['unbundled', t.unbundled],
        ]}
        on={up('curve')}
      />
      <Slide label={t.strength} value={s.strength} min={0} max={3} step={0.1} on={up('strength')} />
      <Check label={t.gradient} value={s.gradient} on={up('gradient')} />
      <Pick
        label={t.flow}
        value={s.flow}
        options={[
          ['dots', t.dots],
          ['dashes', t.dashes],
          ['none', t.none],
        ]}
        on={up('flow')}
      />
      <Slide label={t.speed} value={s.speed} min={0} max={4} step={0.1} on={up('speed')} />
      <Pick
        label={t.hover}
        value={s.hover}
        options={[
          ['current', t.hoverNow],
          ['old', t.hoverOld],
        ]}
        on={up('hover')}
      />
      <Pick
        label={t.labels}
        value={s.labels}
        options={[
          ['none', t.labelsNone],
          ['hubs', t.labelsHubs],
          ['current', t.labelsNow],
          ['all', t.labelsAll],
        ]}
        on={up('labels')}
      />
      <Check label={t.glow} value={s.glow} on={up('glow')} />
      <Check label={t.all} value={s.all} on={up('all')} />
      <Check label={t.texture} value={s.texture} on={up('texture')} />
      <p class="text-neutral-500">{t.textureNote}</p>
    </>
  );
}

function Controls3D(p: { s: Lab3D; set: (s: Lab3D) => void; t: Text }) {
  const { s, t } = p;
  const up =
    <K extends keyof Lab3D>(k: K) =>
    (v: Lab3D[K]) =>
      p.set({ ...s, [k]: v });
  return (
    <>
      <Pick
        label={t.links}
        value={s.links}
        options={[
          ['lines', t.lines],
          ['tubes', t.tubes],
        ]}
        on={up('links')}
      />
      <Slide
        label={t.curvature}
        value={s.curvature}
        min={0}
        max={0.6}
        step={0.02}
        on={up('curvature')}
      />
      <Pick
        label={t.flow}
        value={s.flow}
        options={[
          ['comets', t.comets],
          ['particles', t.particles],
          ['none', t.none],
        ]}
        on={up('flow')}
      />
      <Slide label={t.speed} value={s.speed} min={0} max={4} step={0.1} on={up('speed')} />
      <Pick
        label={t.glow3}
        value={s.glow}
        options={[
          ['cloud', t.cloud],
          ['sprites', t.sprites],
        ]}
        on={up('glow')}
      />
      <Slide label={t.spacing} value={s.spacing} min={0.5} max={2} step={0.05} on={up('spacing')} />
      <Check label={t.bloom} value={s.bloom} on={up('bloom')} />
      <Check label={t.spin} value={s.spin} on={up('spin')} />
      <Check label={t.fog} value={s.fog} on={up('fog')} />
      <Check label={t.all} value={s.all} on={up('all')} />
    </>
  );
}

// ---- Scripted motion ---------------------------------------------------------------------

type Motion = { at: (k: number) => void; done: () => void };

/** Five seconds of panning in a loop while zooming out and in about the centre. */
function panZoom(cy: cytoscape.Core): Motion {
  const z0 = cy.zoom();
  const p0 = { ...cy.pan() };
  const cx = cy.width() / 2;
  const cyy = cy.height() / 2;
  return {
    at(k) {
      const a = k * Math.PI * 2;
      const zoom = z0 * (1 + 0.6 * Math.sin(a * 2));
      const f = zoom / z0;
      cy.viewport({
        zoom,
        pan: {
          x: cx - (cx - p0.x) * f + 220 * Math.sin(a),
          y: cyy - (cyy - p0.y) * f + 140 * Math.sin(a * 2),
        },
      });
    },
    done: () => void cy.viewport({ zoom: z0, pan: p0 }),
  };
}

type Vec = { x: number; y: number; z: number };
type Camera3 = {
  cameraPosition(pos?: Vec, lookAt?: Vec, ms?: number): Vec & object;
  controls(): { target: Vec };
};

/** One full turn of the camera about the orbit target. */
function orbit(m: Map3D): Motion {
  const fg = m.lab.fg as unknown as Camera3;
  const c = { ...fg.controls().target };
  const p = fg.cameraPosition();
  const p0 = { x: p.x, y: p.y, z: p.z };
  const r = Math.hypot(p0.x - c.x, p0.z - c.z);
  const a0 = Math.atan2(p0.z - c.z, p0.x - c.x);
  return {
    at(k) {
      const a = a0 + k * Math.PI * 2;
      fg.cameraPosition({ x: c.x + r * Math.cos(a), y: p0.y, z: c.z + r * Math.sin(a) }, c);
    },
    done: () => void fg.cameraPosition(p0, c),
  };
}

// ---- 3D runtime -------------------------------------------------------------------------

type Lab3DRuntime = { apply: (s: Lab3D) => void; dispose: () => void };
type LinkLike = {
  source: { id: string; x: number; y: number; z: number } | string;
  target: { id: string; x: number; y: number; z: number } | string;
  type: EdgeType;
  family: keyof typeof FAMILY_COLOURS;
};
type NodeLike = { id: string; x: number; y: number; z: number; __threeObj?: Obj };
type Obj = { scale: { setScalar(v: number): void; set(x: number, y: number, z: number): void } };
type Acc<T> = (l: LinkLike) => T;
/** The slice of 3d-force-graph the lab drives (accessors are re-evaluated on set). */
type Fg = {
  linkVisibility(): Acc<boolean>;
  linkVisibility(f: Acc<boolean>): Fg;
  linkColor(): Acc<string>;
  linkColor(f: Acc<string>): Fg;
  linkDirectionalArrowLength(): Acc<number>;
  linkDirectionalArrowLength(f: Acc<number>): Fg;
  linkWidth(w: number): Fg;
  linkOpacity(o: number): Fg;
  linkCurvature(c: number): Fg;
  linkDirectionalParticles(f: Acc<number> | number): Fg;
  linkDirectionalParticleSpeed(v: number): Fg;
  linkDirectionalParticleWidth(v: number): Fg;
  linkDirectionalParticleColor(f: Acc<string>): Fg;
  graphData(): { nodes: NodeLike[]; links: LinkLike[] };
  postProcessingComposer(): { addPass(p: unknown): void; removePass(p: unknown): void };
  width(): number;
  height(): number;
  d3ReheatSimulation(): Fg;
};

async function setup3D(m: Map3D): Promise<Lab3DRuntime> {
  const L = m.lab;
  const THREE = L.THREE;
  const { UnrealBloomPass } = await import('three/examples/jsm/postprocessing/UnrealBloomPass.js');
  const fg = L.fg as unknown as Fg;
  const drawn = L.drawn as unknown as Acc<boolean>;
  const focusOf = L.focusOf as unknown as Acc<boolean>;
  const prod = {
    vis: fg.linkVisibility(),
    colour: fg.linkColor(),
    arrow: fg.linkDirectionalArrowLength(),
  };
  const { nodes, links } = fg.graphData();
  const endOf = (x: LinkLike['source']) => (typeof x === 'string' ? x : x.id);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const faded = (l: LinkLike) => L.faded(endOf(l.source)) || L.faded(endOf(l.target));
  const cfg = EXPLORER.three;

  // Curvature: re-bend the merged web and the comets' curves (as explorer-3d does).
  const webPos = L.web.geometry.getAttribute('position') as InstanceType<
    typeof THREE.BufferAttribute
  >;
  const seg = webPos.count / links.length / 2;
  let bentAt = 0.12;
  const bend = (k: number) => {
    if (k === bentAt) return;
    bentAt = k;
    const arr = webPos.array as Float32Array;
    links.forEach((l, i) => {
      const a = byId.get(endOf(l.source))!;
      const b = byId.get(endOf(l.target))!;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, b.y - a.y, dz) || 1;
      const sl = Math.hypot(dz, dx) || 1;
      const c = {
        x: (a.x + b.x) / 2 + (-dz / sl) * len * k,
        y: (a.y + b.y) / 2,
        z: (a.z + b.z) / 2 + (dx / sl) * len * k,
      };
      L.curve.set([a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z], i * 9);
      const at = (t: number) => {
        const u = 1 - t;
        return [
          u * u * a.x + 2 * u * t * c.x + t * t * b.x,
          u * u * a.y + 2 * u * t * c.y + t * t * b.y,
          u * u * a.z + 2 * u * t * c.z + t * t * b.z,
        ];
      };
      for (let j = 0; j < seg; j++) {
        arr.set(at(j / seg), (i * seg + j) * 6);
        arr.set(at((j + 1) / seg), (i * seg + j) * 6 + 3);
      }
    });
    webPos.needsUpdate = true;
  };

  // Old glow: one additive sprite per term, its colour copied from the point cloud's.
  const texture = L.glowMat.uniforms.map.value as InstanceType<typeof THREE.Texture>;
  const glowCol = L.glow.geometry.getAttribute('color');
  const glowSize = L.glow.geometry.getAttribute('size');
  let sprites: InstanceType<typeof THREE.Group> | null = null;
  let syncTimer = 0;
  const setSprites = (on: boolean) => {
    L.glow.visible = !on;
    if (on === !!sprites) return;
    window.clearInterval(syncTimer);
    if (!on) {
      L.scene.remove(sprites!);
      sprites!.children.forEach((c) => (c as InstanceType<typeof THREE.Sprite>).material.dispose());
      sprites = null;
      return;
    }
    const g = new THREE.Group();
    nodes.forEach((n, i) => {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
          opacity: 0.55,
        }),
      );
      const r = (glowSize.getX(i) / cfg.glowScale) * 5;
      sp.scale.set(r, r, 1);
      sp.position.set(n.x, n.y, n.z);
      g.add(sp);
    });
    const sync = () =>
      g.children.forEach((c, i) => {
        const sp = c as InstanceType<typeof THREE.Sprite>;
        const [r, gg, b] = [glowCol.getX(i), glowCol.getY(i), glowCol.getZ(i)];
        sp.visible = r + gg + b > 0;
        sp.material.color.setRGB(r, gg, b);
      });
    sync();
    syncTimer = window.setInterval(sync, 250);
    sprites = g;
    L.scene.add(g);
  };

  // Bloom: one UnrealBloomPass on 3d-force-graph's composer.
  let bloom: InstanceType<typeof UnrealBloomPass> | null = null;
  const setBloom = (on: boolean) => {
    if (on === !!bloom) return;
    const composer = fg.postProcessingComposer();
    if (on) {
      bloom = new UnrealBloomPass(new THREE.Vector2(fg.width(), fg.height()), 0.9, 0.5, 0.55);
      composer.addPass(bloom);
    } else {
      composer.removePass(bloom);
      bloom!.dispose();
      bloom = null;
    }
  };

  // Spacing: the scene scales about the origin; terms, labels and sprites keep their size.
  const labelScale = new Map<object, [number, number]>();
  L.scene.children.forEach((c) => {
    if (c instanceof THREE.Sprite) labelScale.set(c, [c.scale.x, c.scale.y]);
  });
  const setSpacing = (k: number) => {
    L.scene.scale.setScalar(k);
    for (const n of nodes) n.__threeObj?.scale.setScalar(1 / k);
    for (const [c, [x, y]] of labelScale) (c as Obj).scale.set(x / k, y / k, 1);
    sprites?.children.forEach((c, i) => {
      const r = ((glowSize.getX(i) / cfg.glowScale) * 5) / k;
      c.scale.set(r, r, 1);
    });
  };

  let last: Lab3D | null = null;
  return {
    apply(s) {
      const tubes = s.links === 'tubes';
      const particles = s.flow === 'particles';
      const perLink = tubes || particles;
      if (
        !last ||
        last.links !== s.links ||
        last.flow !== s.flow ||
        last.speed !== s.speed ||
        last.curvature !== s.curvature
      ) {
        L.web.visible = !tubes;
        fg.linkWidth(tubes ? 0.6 : 0)
          .linkOpacity(tubes ? 0.5 : 1)
          .linkCurvature(s.curvature)
          .linkVisibility(perLink ? (l) => drawn(l) || prod.vis(l) : prod.vis)
          .linkColor(
            tubes
              ? (l) => (faded(l) ? 'rgba(82,82,82,0.08)' : FAMILY_COLOURS[l.family])
              : perLink
                ? (l) => (focusOf(l) ? prod.colour(l) : 'rgba(0,0,0,0)')
                : prod.colour,
          )
          .linkDirectionalArrowLength(tubes ? (l) => (isDirected(l.type) ? 3.5 : 0) : prod.arrow)
          .linkDirectionalParticles(
            particles ? (l) => (isDirected(l.type) && (drawn(l) || focusOf(l)) ? 1 : 0) : 0,
          )
          .linkDirectionalParticleSpeed(0.006 * s.speed)
          .linkDirectionalParticleWidth(1.4)
          .linkDirectionalParticleColor((l) => FAMILY_COLOURS[l.family])
          .d3ReheatSimulation();
        L.flow.visible = s.flow === 'comets';
        L.flowCfg.speed = cfg.flow.speed * s.speed;
        bend(s.curvature);
      }
      setSprites(s.glow === 'sprites');
      setBloom(s.bloom);
      m.spin(s.spin);
      L.scene.fog = s.fog ? new THREE.FogExp2(cfg.background, cfg.fogDensity) : null;
      L.glowMat.uniforms.fogDensity.value = s.fog ? cfg.fogDensity : 0;
      L.flowMat.uniforms.fogDensity.value = s.fog ? cfg.fogDensity : 0;
      setSpacing(s.spacing);
      last = s;
    },
    dispose() {
      window.clearInterval(syncTimer);
    },
  };
}
