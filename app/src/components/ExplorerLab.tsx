import type { ComponentChildren, ComponentProps } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type cytoscape from 'cytoscape';
import Explorer from './Explorer';
import type { Map2D } from '../lib/explorer-2d';
import type { Map3D } from '../lib/explorer-3d';
import type { Graph } from '../lib/graph-model';
import type { EdgeType } from '../schema';
import { EXPLORER } from '../lib/explorer-config';
import { useTheme } from '../lib/use-theme';
import { FADE_TRANSITIONS, attachHover } from '../lib/graph-cytoscape';
import { separate } from '../lib/graph-layout';
import {
  FAMILY_COLOURS,
  clusterColour,
  familyColours,
  type MapTheme,
  FLOW_DASH,
  domainColour,
  homeDomain,
  isDirected,
  MAP_INK,
} from '../lib/graph-style';
import {
  DEFAULT_2D,
  DEFAULT_3D,
  averageFps,
  changed,
  frameStats,
  fromQuery,
  rules2D,
  stateRules,
  toneRules,
  toneValues,
  tone,
  importance,
  intensity,
  alphaGain,
  widthGain,
  emphasise,
  EMPHASES,
  type Lab2D,
  type Lab3D,
} from '../lib/explorer-lab';

/**
 * Sub-domain clustering: 2D islands shrink to `tight2d` × and sit `gap2d` px further
 * apart; 3D clusters move `spread3d` × away from their domain's centre and shrink to
 * `tight3d` ×, so each domain galaxy becomes a group of sub-galaxies.
 */
const SUB = { tight2d: 0.8, gap2d: 70, spread3d: 1.4, tight3d: 0.7 };

/** Whether any cream-map tone value differs from today's. */
const toneActive = (s: Record<string, unknown>) =>
  (
    ['nodeSat', 'nodeLight', 'edgeDark', 'edgeAlpha', 'shadow', 'labelWeight', 'labelHalo'] as const
  ).some((k) => k in s && s[k] !== (DEFAULT_2D as Record<string, unknown>)[k]);

/** A base stylesheet entry, re-laid as a lab rule. */
const asRule = (r: { selector: string }) => r as ReturnType<typeof rules2D>[number];

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
    emph: 'Emphasis by importance',
    emphOff: 'Off (today)',
    emphOpacity: 'Opacity',
    emphColour: 'Colour (saturation, lightness)',
    emphWidth: 'Line width',
    emphCombined: 'Combined',
    spread: 'Importance spread',
    emphNote:
      'Importance = type rank (requires, kind of, part of first; used with last) × the edge weight.',
    emphNote3d: 'Lines are one pixel wide: width shows on tubes only.',
    bloomLight: 'Bloom applies to the night map only.',
    layout: 'Layout (relayout)',
    mindist: 'Minimum node distance',
    sub: 'Sub-domain clusters',
    clabels: 'Faint cluster names',
    toneTitle: 'Cream map contrast',
    toneNote: 'Applies on the light theme (switch it in the header); live preview.',
    nodeSat: 'Term saturation',
    nodeLight: 'Term lightness',
    edgeDark: 'Edge darkness',
    edgeAlpha: 'Edge opacity',
    shadow: 'Shadow strength',
    labelWeight: 'Label weight',
    labelHalo: 'Label halo',
    copy: 'Copy values',
    copied: 'Copied',
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
    emph: 'Fremhævning efter vigtighed',
    emphOff: 'Fra (i dag)',
    emphOpacity: 'Gennemsigtighed',
    emphColour: 'Farve (mætning, lyshed)',
    emphWidth: 'Stregbredde',
    emphCombined: 'Kombineret',
    spread: 'Vigtighedsspredning',
    emphNote:
      'Vigtighed = typens rang (kræver, er en slags, er del af først; bruges med sidst) × kantens vægt.',
    emphNote3d: 'Linjer er én pixel brede: bredde ses kun på rør.',
    bloomLight: 'Bloom virker kun på natkortet.',
    layout: 'Layout (nyt layout)',
    mindist: 'Mindste nodeafstand',
    sub: 'Underdomæne-klynger',
    clabels: 'Svage klyngenavne',
    toneTitle: 'Kontrast på det lyse kort',
    toneNote: 'Gælder det lyse tema (skift det i sidehovedet); vises med det samme.',
    nodeSat: 'Begrebsmætning',
    nodeLight: 'Begrebslyshed',
    edgeDark: 'Kantmørke',
    edgeAlpha: 'Kantgennemsigtighed',
    shadow: 'Skyggestyrke',
    labelWeight: 'Etiketvægt',
    labelHalo: 'Etiketkant',
    copy: 'Kopiér værdier',
    copied: 'Kopieret',
  },
};
type Text = (typeof TEXT)['en'];

const CHOICES_2D = {
  curve: ['haystack', 'bezier', 'unbundled'],
  flow: ['dots', 'dashes', 'none'],
  hover: ['current', 'old'],
  labels: ['none', 'hubs', 'current', 'all'],
  emph: EMPHASES,
} as const;
const CHOICES_3D = {
  links: ['lines', 'tubes'],
  flow: ['comets', 'particles', 'none'],
  glow: ['cloud', 'sprites'],
  emph: EMPHASES,
} as const;

/**
 * The hidden visual lab (A96): the real Explorer, plus a floating panel that swaps in
 * old visual effects live (restyle, never relayout), a frame meter and a scripted
 * benchmark. Toggles start from the address (`?curve=bezier&bench=1`); nothing is stored.
 */
export default function ExplorerLab(props: Props) {
  const { view, lang } = props;
  const t = TEXT[lang];
  // The maps follow the page theme (A92) through their own `retheme`; the lab re-reads
  // the restyled base stylesheet and lays its rules over it again.
  const theme = useTheme();
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
      return n ? domainColour(homeDomain(n), theme) : '#888888';
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
  }, [cy, graph, theme]);

  // Emphasis by importance: each edge's opacity, colour and width as data the rules read.
  useEffect(() => {
    if (!cy || !graph || s2.emph === 'off') return;
    const imp = importance(graph.links);
    const light = theme === 'light';
    const { restAlpha, crossAlpha, allAlpha } = EXPLORER.edges;
    cy.batch(() =>
      cy
        .edges()
        .not('.bundle')
        .forEach((e) => {
          const k = intensity(imp[Number(e.id().slice(1))] ?? 0, s2.spread);
          const a = alphaGain(k);
          e.data({
            labAlpha: Math.min(1, restAlpha * a),
            labAlphaXc: Math.min(1, crossAlpha * a),
            labAlphaAll: Math.min(1, allAlpha * a),
            labWidth: Number(e.data('width')) * widthGain(k),
            labTint: emphasise(String(e.data('tint')), k, light),
            labColour: emphasise(String(e.data('colour')), k, light),
          });
        }),
    );
  }, [cy, graph, s2.emph, s2.spread, theme]);

  useEffect(() => {
    const m = maps.map2d;
    if (!m || !cy || !base2d.current || view !== '2d') return;
    cy.batch(() =>
      cy
        .edges()
        .not('.bundle')
        .forEach((e) => void e.data('labCurve', Number(e.data('curve')) * s2.strength)),
    );
    // The cream map's tone first, then the toggles (emphasis wins over tone).
    const toned = theme === 'light' && toneActive(s2);
    const extra = [
      ...(toned
        ? toneRules(
            s2,
            {
              rest: EXPLORER.edges.restAlpha,
              cross: EXPLORER.edges.crossAlpha,
              all: EXPLORER.edges.allAlpha,
            },
            MAP_INK.light.underlayAlpha,
          ).map(asRule)
        : []),
      ...rules2D(s2, FLOW_DASH),
    ];
    if (s2.hover === 'old') extra.push(...(FADE_TRANSITIONS as unknown as typeof extra));
    // Hover, selection and route states still win over the emphasis and the tone.
    if (s2.emph !== 'off' || toned)
      extra.push(...stateRules(base2d.current as { selector: string }[]).map(asRule));
    cy.style()
      .fromJson([...base2d.current, ...extra] as cytoscape.StylesheetJson)
      .update();
    m.lab.setDots(s2.flow === 'dots');
    m.lab.dots.speed = EXPLORER.dots.speed * s2.speed;
    (cy as unknown as { renderer(): { textureOnViewport: boolean } }).renderer().textureOnViewport =
      s2.texture;
  }, [maps, cy, graph, s2, view, theme]);

  // Relayout (lab only): minimum distance and sub-domain clustering re-space the islands.
  const laid2d = useRef('1|false');
  useEffect(() => {
    const m = maps.map2d;
    const key = `${s2.mindist}|${s2.sub}`;
    if (!m || key === laid2d.current) return;
    laid2d.current = key;
    m.lab.relayout({
      spacing: s2.mindist,
      tight: s2.sub ? SUB.tight2d : 1,
      gap: s2.sub ? SUB.gap2d : 0,
    });
  }, [maps, s2.mindist, s2.sub]);

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
    void setup3D(m, props.clusterLabels).then((rt) => {
      if (cancelled) return rt.dispose();
      three.current = rt;
      rt.apply(s3, theme);
    });
    return () => {
      cancelled = true;
      three.current?.dispose();
      three.current = null;
    };
  }, [maps.map3d]);
  useEffect(() => three.current?.apply(s3, theme), [s3, theme]);

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
        class="absolute right-3 bottom-3 z-30 w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border border-border bg-bg/90 p-3 text-xs text-fg-soft shadow-lg shadow-black/15 backdrop-blur dark:shadow-black/40"
        role="group"
        aria-label={t.title}
        data-lab-panel
      >
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-[11px] tracking-widest text-muted uppercase">
            {t.title} · {view.toUpperCase()}
          </h2>
          <button
            type="button"
            class="rounded-full border border-border-strong px-2 py-0.5 text-muted hover:text-fg"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? t.hide : t.show}
          </button>
        </div>
        <p class="mt-1.5 font-mono text-fg" ref={meter} aria-label={t.meter}>
          -
        </p>
        <div class="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            class="rounded-full border border-border-hover bg-surface-2/80 shrink-0 px-2.5 py-1 whitespace-nowrap text-fg disabled:opacity-50"
            disabled={running || !ready}
            title={view === '2d' ? t.benchPan : t.benchOrbit}
            onClick={runBench}
          >
            {running ? t.running : t.bench}
          </button>
          {res && (
            <span class="font-mono text-amber-700 dark:text-amber-200" data-lab-result={result}>
              {res.fps} {t.fps} {t.average} · {t.low} {res.low}
            </span>
          )}
        </div>
        <p class="mt-1.5 text-muted">
          {t.active}: <span class="text-fg-soft">{active.join(', ') || t.defaults}</span>
        </p>
        {open && (
          <div class="mt-2 max-h-[50vh] space-y-2 overflow-y-auto border-t border-border pt-2">
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
        class="max-w-40 rounded border border-border-strong bg-surface px-1 py-0.5 text-fg"
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
      <Slide label={t.strength} value={s.strength} min={0} max={4} step={0.1} on={up('strength')} />
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
      <Emph s={s} set={p.set} t={t} />
      <Check label={t.texture} value={s.texture} on={up('texture')} />
      <p class="text-muted">{t.textureNote}</p>
      <LayoutControls s={s} set={p.set} t={t} />
      <ToneControls s={s} set={p.set} t={t}>
        <Slide
          label={t.labelWeight}
          value={s.labelWeight}
          min={3}
          max={8}
          step={1}
          on={up('labelWeight')}
        />
        <Slide
          label={t.labelHalo}
          value={s.labelHalo}
          min={0}
          max={5}
          step={0.5}
          on={up('labelHalo')}
        />
      </ToneControls>
    </>
  );
}

/** Relayout: minimum distance and sub-domain clustering (2D and 3D). */
function LayoutControls<S extends Lab2D | Lab3D>(p: { s: S; set: (s: S) => void; t: Text }) {
  const { s, t } = p;
  return (
    <section class="space-y-2 border-t border-border pt-2">
      <h3 class="text-[11px] tracking-widest text-muted uppercase">{t.layout}</h3>
      <Slide
        label={t.mindist}
        value={s.mindist}
        min={0.8}
        max={1.4}
        step={0.05}
        on={(v) => p.set({ ...s, mindist: v })}
      />
      <Check label={t.sub} value={s.sub} on={(v) => p.set({ ...s, sub: v })} />
    </section>
  );
}

/** Cream-map contrast sliders and "copy values" (2D and 3D). */
function ToneControls<S extends Lab2D | Lab3D>(p: {
  s: S;
  set: (s: S) => void;
  t: Text;
  children?: ComponentChildren;
}) {
  const { s, t } = p;
  const [copied, setCopied] = useState('');
  const set = (k: 'nodeSat' | 'nodeLight' | 'edgeDark' | 'edgeAlpha' | 'shadow') => (v: number) =>
    p.set({ ...s, [k]: v });
  const copy = () => {
    const text = JSON.stringify(toneValues(s), null, 2);
    setCopied(text);
    void navigator.clipboard?.writeText(text).catch(() => undefined);
  };
  return (
    <section class="space-y-2 border-t border-border pt-2">
      <h3 class="text-[11px] tracking-widest text-muted uppercase">{t.toneTitle}</h3>
      <p class="text-muted">{t.toneNote}</p>
      <Slide
        label={t.nodeSat}
        value={s.nodeSat}
        min={0.4}
        max={1.8}
        step={0.05}
        on={set('nodeSat')}
      />
      <Slide
        label={t.nodeLight}
        value={s.nodeLight}
        min={-0.3}
        max={0.3}
        step={0.01}
        on={set('nodeLight')}
      />
      <Slide
        label={t.edgeDark}
        value={s.edgeDark}
        min={0}
        max={0.4}
        step={0.01}
        on={set('edgeDark')}
      />
      <Slide
        label={t.edgeAlpha}
        value={s.edgeAlpha}
        min={0.4}
        max={3}
        step={0.05}
        on={set('edgeAlpha')}
      />
      <Slide label={t.shadow} value={s.shadow} min={0} max={4} step={0.1} on={set('shadow')} />
      {p.children}
      <button
        type="button"
        class="rounded-full border border-border-strong px-2.5 py-1 text-fg hover:border-border-hover"
        onClick={copy}
        data-lab-copy
      >
        {copied ? t.copied : t.copy}
      </button>
      {copied && (
        <pre class="overflow-x-auto rounded bg-surface p-2 font-mono text-[11px] select-all">
          {copied}
        </pre>
      )}
    </section>
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
      {s.bloom && <p class="text-muted">{t.bloomLight}</p>}
      <Check label={t.spin} value={s.spin} on={up('spin')} />
      <Check label={t.fog} value={s.fog} on={up('fog')} />
      <Check label={t.all} value={s.all} on={up('all')} />
      <Emph s={s} set={p.set} t={t} />
      {s.emph !== 'off' && <p class="text-muted">{t.emphNote3d}</p>}
      <LayoutControls s={s} set={p.set} t={t} />
      <Check label={t.clabels} value={s.clabels} on={up('clabels')} />
      <ToneControls s={s} set={p.set} t={t} />
    </>
  );
}

/** Emphasis by importance: the mode and the spread (shared by 2D and 3D). */
function Emph<S extends Lab2D | Lab3D>(p: { s: S; set: (s: S) => void; t: Text }) {
  const { s, t } = p;
  return (
    <>
      <Pick
        label={t.emph}
        value={s.emph}
        options={[
          ['off', t.emphOff],
          ['opacity', t.emphOpacity],
          ['colour', t.emphColour],
          ['width', t.emphWidth],
          ['combined', t.emphCombined],
        ]}
        on={(v) => p.set({ ...s, emph: v })}
      />
      <Slide
        label={t.spread}
        value={s.spread}
        min={0}
        max={4}
        step={0.1}
        on={(v) => p.set({ ...s, spread: v })}
      />
      {s.emph !== 'off' && <p class="text-muted">{t.emphNote}</p>}
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

type Lab3DRuntime = { apply: (s: Lab3D, theme: MapTheme) => void; dispose: () => void };
type LinkLike = {
  source: NodeLike | string;
  target: NodeLike | string;
  type: EdgeType;
  family: keyof typeof FAMILY_COLOURS;
  weight: number;
};
type NodeLike = {
  id: string;
  cluster: string;
  domain: string[];
  x: number;
  y: number;
  z: number;
  __threeObj?: Obj;
};
type Obj = { scale: { setScalar(v: number): void; set(x: number, y: number, z: number): void } };
type Acc<T> = (l: LinkLike) => T;
/** The slice of 3d-force-graph the lab drives (accessors are re-evaluated on set). */
type Fg = {
  linkVisibility(): Acc<boolean>;
  linkVisibility(f: Acc<boolean>): Fg;
  linkColor(): Acc<string>;
  linkColor(f: Acc<string>): Fg;
  nodeColor(): (n: NodeLike) => string;
  nodeColor(f: (n: NodeLike) => string): Fg;
  linkDirectionalArrowLength(): Acc<number>;
  linkDirectionalArrowLength(f: Acc<number>): Fg;
  linkWidth(w: number | Acc<number>): Fg;
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
  backgroundColor(): string;
  d3ReheatSimulation(): Fg;
};

async function setup3D(m: Map3D, clusterLabels: Record<string, string>): Promise<Lab3DRuntime> {
  const L = m.lab;
  const THREE = L.THREE;
  const [{ UnrealBloomPass }, { OutputPass }] = await Promise.all([
    import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
    import('three/examples/jsm/postprocessing/OutputPass.js'),
  ]);
  const fg = L.fg as unknown as Fg;
  const drawn = L.drawn as unknown as Acc<boolean>;
  const focusOf = L.focusOf as unknown as Acc<boolean>;
  const prod = {
    vis: fg.linkVisibility(),
    colour: fg.linkColor(),
    arrow: fg.linkDirectionalArrowLength(),
    node: fg.nodeColor(),
  };
  const { nodes, links } = fg.graphData();
  const endOf = (x: LinkLike['source']) => (typeof x === 'string' ? x : x.id);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const faded = (l: LinkLike) => L.faded(endOf(l.source)) || L.faded(endOf(l.target));
  const cfg = EXPLORER.three;
  // The scene's own fog, recoloured by `retheme`; the lab only switches it off and on.
  const fog = L.scene.fog;

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
        // The light theme multiplies instead of adding (explorer-3d `setBlend`); three.js
        // needs premultiplied alpha for that.
        const multiply = L.glowMat.blending === THREE.MultiplyBlending;
        if (sp.material.premultipliedAlpha !== multiply) {
          sp.material.premultipliedAlpha = multiply;
          sp.material.needsUpdate = true;
        }
        sp.material.blending = L.glowMat.blending;
      });
    sync();
    syncTimer = window.setInterval(sync, 250);
    sprites = g;
    L.scene.add(g);
  };

  // Bloom: an UnrealBloomPass on 3d-force-graph's composer and an OutputPass for the colour
  // space (the opaque background is set in `apply`).
  let bloom: InstanceType<typeof UnrealBloomPass> | null = null;
  const output = new OutputPass();
  const setBloom = (on: boolean) => {
    if (on === !!bloom) return;
    const composer = fg.postProcessingComposer();
    if (on) {
      bloom = new UnrealBloomPass(new THREE.Vector2(fg.width(), fg.height()), 0.9, 0.5, 0.55);
      composer.addPass(bloom);
      composer.addPass(output);
    } else {
      composer.removePass(bloom);
      composer.removePass(output);
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

  // Emphasis by importance: per-link intensity, fed to the web's gain / tint hooks and
  // to the tubes' width and colour.
  const imp = importance(links);
  const indexOf = new Map(links.map((l, i) => [l, i]));
  let kOf = new Float32Array(links.length).fill(1);
  /** Emphasis and the cream map's edge tone, through explorer-3d's web gain / tint hooks. */
  const emphasis = (s: Lab3D, theme: MapTheme) => {
    const on = s.emph !== 'off';
    const alpha = s.emph === 'opacity' || s.emph === 'combined';
    const colour = s.emph === 'colour' || s.emph === 'combined';
    const light = theme === 'light';
    const toned = light && toneActive(s);
    kOf = new Float32Array(imp.map((v) => (on ? intensity(v, s.spread) : 1)));
    links.forEach((l, i) => {
      L.webGain[i] = (alpha ? alphaGain(kOf[i]) : 1) * (toned ? s.edgeAlpha : 1);
      if (!colour && !toned) L.webTint[i] = null;
      else {
        const src = typeof l.source === 'string' ? byId.get(l.source)! : l.source;
        let c = clusterColour(src.cluster, homeDomain(src), theme);
        if (colour) c = emphasise(c, kOf[i], light);
        if (toned) c = tone(c, 1, -s.edgeDark);
        L.webTint[i] = new THREE.Color(c);
      }
    });
    // Terms: saturation and lightness over the Explorer's own colour; glow / shadow strength.
    fg.nodeColor(toned ? (n) => tone(prod.node(n), s.nodeSat, s.nodeLight) : prod.node);
    L.glowMat.uniforms.opacity.value = cfg.glowOpacity * (light ? 0.7 : 1) * (toned ? s.shadow : 1);
    L.repaint();
  };

  // Relayout (lab only): sub-domain clusters (each cluster pulled out from its domain's
  // centre and drawn in) and a minimum distance between terms, from the original layout.
  const orig = nodes.map((n) => ({ x: n.x, y: n.y, z: n.z }));
  const glowPos = L.glow.geometry.getAttribute('position');
  const hubH = cfg.hubLabelHeight;
  const centroid = (ids: number[], ps: { x: number; y: number; z: number }[]) => {
    const c = { x: 0, y: 0, z: 0 };
    for (const i of ids) {
      c.x += ps[i].x / ids.length;
      c.y += ps[i].y / ids.length;
      c.z += ps[i].z / ids.length;
    }
    return c;
  };
  const group = (key: (n: NodeLike) => string) => {
    const out = new Map<string, number[]>();
    nodes.forEach((n, i) => out.set(key(n), [...(out.get(key(n)) ?? []), i]));
    return out;
  };
  const byCluster = group((n) => n.cluster);
  const byDomain = group((n) => homeDomain(n));
  let laid = '1|false';
  const relayout = (s: Lab3D) => {
    const key = `${s.mindist}|${s.sub}`;
    if (key === laid) return;
    laid = key;
    const ps = orig.map((p) => ({ ...p }));
    if (s.sub) {
      const domC = new Map([...byDomain].map(([d, ids]) => [d, centroid(ids, orig)]));
      for (const ids of byCluster.values()) {
        const c = centroid(ids, orig);
        const d = domC.get(homeDomain(nodes[ids[0]]))!;
        for (const i of ids)
          for (const a of ['x', 'y', 'z'] as const)
            ps[i][a] = d[a] + (c[a] - d[a]) * SUB.spread3d + (orig[i][a] - c[a]) * SUB.tight3d;
      }
    }
    if (s.mindist !== 1 || s.sub) {
      const r = nodes.map((n) => L.radius(n as unknown as Parameters<typeof L.radius>[0]));
      separate(
        ps,
        (i, j) => s.mindist * ((EXPLORER.spacing.factor * (r[i] + r[j])) / 2 + cfg.labelClearance),
        60,
      );
    }
    nodes.forEach((n, i) => {
      const p = ps[i] as NodeLike & { fx?: number; fy?: number; fz?: number };
      Object.assign(n, { x: p.x, y: p.y, z: p.z, fx: p.x, fy: p.y, fz: p.z });
      glowPos.setXYZ(i, p.x, p.y, p.z);
      sprites?.children[i]?.position.set(p.x, p.y, p.z);
    });
    glowPos.needsUpdate = true;
    for (const [id, sprite] of L.labels) {
      const n = byId.get(id);
      if (n)
        sprite.position.set(
          n.x,
          n.y + L.radius(n as unknown as Parameters<typeof L.radius>[0]) + hubH * 0.7,
          n.z,
        );
    }
    bentAt = NaN;
    bend(last?.curvature ?? DEFAULT_3D.curvature);
    links.forEach((_, i) => {
      const o = i * 9;
      L.linkLength[i] = Math.hypot(
        L.curve[o + 6] - L.curve[o],
        L.curve[o + 7] - L.curve[o + 1],
        L.curve[o + 8] - L.curve[o + 2],
      );
    });
    placeClusterLabels();
    fg.d3ReheatSimulation();
  };

  // Faint cluster names, one sprite at each cluster's centre.
  const clusterNames = new Map<string, InstanceType<typeof THREE.Sprite>>();
  const placeClusterLabels = () => {
    for (const [c, sprite] of clusterNames) {
      const ids = byCluster.get(c)!;
      const p = centroid(ids, nodes);
      const top = Math.max(...ids.map((i) => nodes[i].y));
      sprite.position.set(p.x, top + 30, p.z);
    }
  };
  const setClusterLabels = (on: boolean, theme: MapTheme) => {
    for (const s of clusterNames.values()) {
      L.scene.remove(s);
      s.material.map?.dispose();
      s.material.dispose();
    }
    clusterNames.clear();
    if (!on) return;
    for (const c of byCluster.keys()) {
      const text = clusterLabels[c] ?? c;
      const canvas = document.createElement('canvas');
      const g = canvas.getContext('2d')!;
      const px = 40;
      g.font = `500 ${px}px system-ui, sans-serif`;
      canvas.width = Math.ceil(g.measureText(text).width) + 16;
      canvas.height = px + 16;
      g.font = `500 ${px}px system-ui, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = MAP_INK[theme].tick;
      g.fillText(text, canvas.width / 2, canvas.height / 2);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(canvas),
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
          fog: true,
        }),
      );
      const h = 20;
      sprite.scale.set((h * canvas.width) / canvas.height, h, 1);
      clusterNames.set(c, sprite);
      L.scene.add(sprite);
    }
    placeClusterLabels();
  };
  const tubeColour = (s: Lab3D, theme: MapTheme) => {
    const colour = s.emph === 'colour' || s.emph === 'combined';
    const fam = familyColours(theme);
    return (l: LinkLike) => {
      if (faded(l)) return 'rgba(82,82,82,0.08)';
      const c = fam[l.family];
      return colour ? emphasise(c, kOf[indexOf.get(l) ?? 0], theme === 'light') : c;
    };
  };

  let last: Lab3D | null = null;
  let lastTheme: MapTheme | null = null;
  return {
    apply(s, theme) {
      const tubes = s.links === 'tubes';
      const particles = s.flow === 'particles';
      const perLink = tubes || particles;
      const toneKeys = ['nodeSat', 'nodeLight', 'edgeDark', 'edgeAlpha', 'shadow'] as const;
      const emphChanged =
        !last ||
        last.emph !== s.emph ||
        last.spread !== s.spread ||
        lastTheme !== theme ||
        toneKeys.some((k) => last![k] !== s[k]);
      if (emphChanged) emphasis(s, theme);
      relayout(s);
      if (!last || last.clabels !== s.clabels || lastTheme !== theme)
        setClusterLabels(s.clabels, theme);
      const wide = s.emph === 'width' || s.emph === 'combined';
      if (
        !last ||
        emphChanged ||
        last.links !== s.links ||
        last.flow !== s.flow ||
        last.speed !== s.speed ||
        last.curvature !== s.curvature
      ) {
        L.web.visible = !tubes;
        fg.linkWidth(tubes ? (l) => 0.6 * (wide ? widthGain(kOf[indexOf.get(l) ?? 0]) : 1) : 0)
          .linkOpacity(tubes ? 0.5 : 1)
          .linkCurvature(s.curvature)
          .linkVisibility(perLink ? (l) => drawn(l) || prod.vis(l) : prod.vis)
          .linkColor(
            tubes
              ? tubeColour(s, theme)
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
      // Bloom brightens what is already bright: on the cream map it only washes it out.
      if (bloom) bloom.enabled = theme !== 'light';
      m.spin(s.spin);
      L.scene.fog = s.fog ? fog : null;
      // Bloom needs an opaque background (the canvas is transparent), in the theme's colour.
      L.scene.background = bloom?.enabled ? new THREE.Color(fg.backgroundColor()) : null;
      L.glowMat.uniforms.fogDensity.value = s.fog ? cfg.fogDensity : 0;
      L.flowMat.uniforms.fogDensity.value = s.fog ? cfg.fogDensity : 0;
      setSpacing(s.spacing);
      last = s;
      lastTheme = theme;
    },
    dispose() {
      window.clearInterval(syncTimer);
      setClusterLabels(false, 'dark');
    },
  };
}
