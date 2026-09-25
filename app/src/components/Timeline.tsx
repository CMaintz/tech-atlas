import type { ComponentType } from 'preact';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Graph } from '../lib/graph-model';
import {
  bandsWithin,
  decadeTicks,
  fitPerYear,
  labelWidth,
  lanesOf,
  densityScale,
  packCapped,
  shareRows,
  stretchScale,
  yearLoad,
  type TimelineItem,
} from '../lib/timeline';
import type { PanelConfig } from './TermPanel';

export type TimelineEntry = TimelineItem & {
  summary: string;
  href: string;
  hub: boolean;
};

interface Props {
  items: TimelineEntry[];
  /** Lane order (every domain with a dated term). */
  domains: string[];
  domainLabels: Record<string, string>;
  domainColours: Record<string, string>;
  /** Axis range in years, [start, end). */
  range: [number, number];
  eraLabels: Record<string, string>;
  text: Record<string, string>;
  /** The Explorer's term panel (A80), loaded on first click; absent → popover only. */
  panel?: TimelinePanel;
}

type Dict = Record<string, string>;
export type TimelinePanel = PanelConfig & {
  lang: 'en' | 'da';
  termBase: string;
  clusterLabels: Dict;
  familyLabels: Dict;
  graphUi: Dict;
};
/** TermPanel's props, loosely: it is imported on demand, so only its type is known here. */
type PanelView = ComponentType<Record<string, unknown>>;

// Horizontal (desktop) geometry, px. Zoom 0 fits the whole axis into the chart's width;
// each step in multiplies the fitted px/year.
const H_ZOOM = [1, 1.5, 2.2, 3.2, 4.6];
const ROW_FIT = 17;
const ROW = 22;
const LANE_PAD = 6;
const LABEL_COL = 116;
const H_PAD = 16;
const TOP_AXIS = 44;
const BOTTOM_AXIS = 26;
const CHIP_W = 34;
// Before the island measures: a typical desktop chart width and lane budget.
const SSR_WIDTH = 1280;
const SSR_BUDGET = 560;
// Vertical (small screens) geometry, px.
const V_ZOOM = [4, 6, 10, 16, 22];
const V_ITEM = 20;
const AXIS_COL = 44;
const DEFAULT_ZOOM = 0;

/** The dot for one term: domain colour, larger for hubs, ringed when in a second domain. */
function Dot({ colour, ring, hub }: { colour: string; ring: string | null; hub: boolean }) {
  const size = hub ? 12 : 8;
  return (
    <span
      aria-hidden="true"
      class="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: colour,
        boxShadow: [
          ring ? `0 0 0 1.5px #0a0a0a, 0 0 0 3.5px ${ring}` : '',
          hub ? `0 0 10px ${colour}` : '',
        ]
          .filter(Boolean)
          .join(', '),
      }}
    />
  );
}

/**
 * The swim-lane timeline (Timeline v2): one lane per domain along a year axis with
 * decade ticks and era bands. Horizontal on wide screens, vertical on phones; both are
 * rendered server-side (CSS picks one), so it reads without JavaScript. The island adds
 * domain filtering, zoom and a summary popover.
 */
export default function Timeline(props: Props) {
  const { items, domains, domainLabels, domainColours, text, eraLabels } = props;
  const [start, end] = props.range;
  const [shown, setShown] = useState<string[]>(domains);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [sel, setSel] = useState<{ id: string; pinned: boolean; x: number; y: number } | null>(
    null,
  );
  const popRef = useRef<HTMLDivElement>(null);
  // The term panel: its code (with the graph renderer) and graph.json load on the first
  // click, so the page itself stays a small island.
  const [panelId, setPanelId] = useState<string | null>(null);
  const [panelKit, setPanelKit] = useState<{ View: PanelView; graph: Graph } | null>(null);
  const kitLoading = useRef(false);
  const openPanel = (id: string) => {
    const cfg = props.panel;
    if (!cfg) return;
    setPanelId(id);
    if (panelKit || kitLoading.current) return;
    kitLoading.current = true;
    Promise.all([
      import('./TermPanel'),
      fetch(cfg.graphUrl).then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${cfg.graphUrl}`);
        return r.json() as Promise<Graph>;
      }),
    ]).then(
      ([m, graph]) => {
        setPanelKit({ View: m.default as unknown as PanelView, graph });
        setSel(null); // the panel replaces the pinned popover
      },
      () => (kitLoading.current = false), // keep the popover; a later click retries
    );
  };
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const lanes = useMemo(() => lanesOf(items, shown), [items, shown]);
  const ticks = decadeTicks(start, end);
  const bands = bandsWithin(start, end);

  const ringOf = (it: TimelineEntry, lane: string) => {
    const other = it.domain.find((d) => d !== lane);
    return other ? (domainColours[other] ?? null) : null;
  };

  // ---- horizontal layout: the axis fits the chart's width at zoom 0; each lane gets a
  // share of the viewport's height, and labels that don't fit fold into "+N" chips ----
  const chartRef = useRef<HTMLElement>(null);
  const [avail, setAvail] = useState(SSR_WIDTH);
  const [budget, setBudget] = useState(SSR_BUDGET);
  useLayoutEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const measure = () => {
      if (!el.clientWidth) return; // hidden (phone layout)
      setAvail(el.clientWidth);
      const top = el.getBoundingClientRect().top + window.scrollY;
      setBudget(Math.max(240, window.innerHeight - top - TOP_AXIS - BOTTOM_AXIS - 12));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  const load = useMemo(() => yearLoad(lanes.values()), [lanes]);
  const h = useMemo(() => {
    const axis = avail - LABEL_COL - H_PAD * 2 - 2;
    const scale = densityScale(start, end, fitPerYear(start, end, axis, load) * H_ZOOM[zoom], load);
    const row = zoom === 0 ? ROW_FIT : ROW;
    const font = zoom === 0 ? 11 : 12;
    const laneSpans = [...lanes].map(([lane, list]) => {
      const flip = new Set<string>();
      const spans = list.map((it) => {
        const x = scale.at(it.year + 0.5);
        const w = labelWidth(it.name, it.hub ? font + 1 : font);
        const rank = it.hub ? -1e6 : -it.degree;
        // Near the right edge the label goes left of its dot, so nothing runs off the axis.
        if (x + 16 + w > scale.length + H_PAD) {
          flip.add(it.id);
          return { id: it.id, start: x - 12 - w, end: x + 7, rank };
        }
        return { id: it.id, start: x - 7, end: x + 16 + w, rank };
      });
      return { lane, list, flip, spans, need: packCapped(spans, Infinity, 6).tracks };
    });
    const rowsOf = shareRows(
      laneSpans.map((l) => l.need),
      Math.floor((budget - lanes.size * LANE_PAD * 2) / row),
    );
    const out = laneSpans.map(({ lane, list, flip, spans }, i) => {
      const rows = Math.max(2, rowsOf[i]);
      let packed = packCapped(spans, rows, 6);
      // A lane that overflows gives its last row to the chips.
      if (packed.overflow.length) packed = packCapped(spans, rows - 1, 6);
      const byX = packed.overflow
        .map((id) => ({ id, x: scale.at(byId.get(id)!.year + 0.5) }))
        .sort((a, b) => a.x - b.x);
      const chips: { key: string; x: number; ids: string[] }[] = [];
      for (const o of byX) {
        const last = chips.at(-1);
        if (last && o.x - last.x < CHIP_W) last.ids.push(o.id);
        else chips.push({ key: `${lane}:${o.id}`, x: o.x, ids: [o.id] });
      }
      const tracks = Math.max(1, packed.tracks) + (chips.length ? 1 : 0);
      return {
        lane,
        list: list.filter((it) => packed.track.has(it.id)),
        count: list.length,
        track: packed.track,
        flip,
        chips,
        chipRow: tracks - 1,
        height: tracks * row + LANE_PAD * 2,
      };
    });
    return { scale, lanes: out, width: scale.length + H_PAD * 2, row, font };
  }, [lanes, load, zoom, start, end, avail, budget, byId]);

  // The "+N" chip list: a preview on hover, pinned on click.
  type More = { key: string; ids: string[]; pinned: boolean; x: number; y: number };
  const [more, setMore] = useState<More | null>(null);
  const moreTimer = useRef<number>();
  const openMore = (chip: { key: string; ids: string[] }, el: HTMLElement, pinned: boolean) => {
    clearTimeout(moreTimer.current);
    const r = el.getBoundingClientRect();
    setMore({ key: chip.key, ids: chip.ids, pinned, x: r.left, y: r.bottom });
  };
  const leaveMore = () => {
    clearTimeout(moreTimer.current);
    moreTimer.current = window.setTimeout(() => setMore((m) => (m?.pinned ? m : null)), 180);
  };
  useEffect(() => setMore(null), [zoom, shown]);

  // ---- vertical layout: stretch axis so each lane's entries for a year stack cleanly ----
  const v = useMemo(() => {
    const scale = stretchScale(start, end, V_ZOOM[zoom], (y) =>
      load.has(y) ? load.get(y)! * V_ITEM + 4 : 0,
    );
    const pos = new Map<string, number>();
    for (const list of lanes.values()) {
      let prevYear = NaN;
      let k = 0;
      for (const it of list) {
        k = it.year === prevYear ? k + 1 : 0;
        prevYear = it.year;
        pos.set(it.id, scale.at(it.year) + 2 + k * V_ITEM);
      }
    }
    return { scale, pos };
  }, [lanes, load, zoom, start, end]);

  const toggle = (d: string) =>
    setShown((cur) => {
      const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d];
      return next.length ? domains.filter((x) => next.includes(x)) : domains;
    });

  const open = (id: string, el: HTMLElement, pinned: boolean) => {
    const r = el.getBoundingClientRect();
    setSel({ id, pinned, x: r.left, y: r.bottom });
  };
  const handlers = (it: TimelineEntry) => ({
    onClick: (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      if (panelKit) {
        setSel(null);
        setPanelId(it.id);
        return;
      }
      if (sel?.id === it.id && sel.pinned) setSel(null);
      else {
        open(it.id, e.currentTarget as HTMLElement, true);
        openPanel(it.id);
      }
    },
    onMouseEnter: (e: MouseEvent) => {
      if (!sel?.pinned && matchMedia('(hover: hover)').matches)
        open(it.id, e.currentTarget as HTMLElement, false);
    },
    onMouseLeave: () => setSel((s) => (s?.pinned ? s : null)),
    onFocus: (e: FocusEvent) => {
      if (!sel?.pinned) open(it.id, e.currentTarget as HTMLElement, false);
    },
    onBlur: () => setSel((s) => (s?.pinned ? s : null)),
  });

  useEffect(() => {
    if (!sel?.pinned) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSel(null);
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (!popRef.current?.contains(t) && !t.closest('[data-tl-item]')) setSel(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [sel?.pinned]);

  useEffect(() => {
    if (!more?.pinned) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMore(null);
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('[data-tl-more]')) setMore(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [more?.pinned]);

  const chip =
    'rounded-full border px-3 py-1 text-xs transition-colors hover:border-neutral-400 aria-pressed:text-neutral-100';
  const selItem = sel ? byId.get(sel.id) : undefined;
  const single = shown.length === 1;

  return (
    <div class="tl2">
      {/* ---- controls ---- */}
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <span class="sr-only">{text.filter}</span>
        <button
          type="button"
          class={`${chip} border-neutral-700 text-neutral-400`}
          aria-pressed={shown.length === domains.length}
          onClick={() => setShown(domains)}
        >
          {text.allDomains}
        </button>
        {domains.map((d) => {
          const on = shown.includes(d);
          return (
            <button
              type="button"
              class={`${chip} flex items-center gap-1.5 text-neutral-400`}
              style={{ borderColor: on ? domainColours[d] : '#404040' }}
              aria-pressed={on}
              onClick={() => toggle(d)}
            >
              <span
                aria-hidden="true"
                class="inline-block h-2 w-2 rounded-full"
                style={{ background: on ? domainColours[d] : '#525252' }}
              />
              {domainLabels[d] ?? d}
            </button>
          );
        })}
        <span class="ml-auto flex items-center gap-1" role="group" aria-label={text.zoom}>
          <button
            type="button"
            class="h-7 w-7 rounded border border-neutral-700 text-neutral-300 hover:border-neutral-400 disabled:opacity-40"
            aria-label={text.zoomOut}
            title={text.zoomOut}
            disabled={zoom === 0}
            onClick={() => setZoom((z) => Math.max(0, z - 1))}
          >
            −
          </button>
          <button
            type="button"
            class="h-7 w-7 rounded border border-neutral-700 text-neutral-300 hover:border-neutral-400 disabled:opacity-40"
            aria-label={text.zoomIn}
            title={text.zoomIn}
            disabled={zoom === H_ZOOM.length - 1}
            onClick={() => setZoom((z) => Math.min(H_ZOOM.length - 1, z + 1))}
          >
            +
          </button>
        </span>
      </div>
      <p class="mb-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-neutral-400">
        <span class="flex items-center gap-2">
          <Dot colour={domainColours[domains[0]] ?? '#d4d4d4'} ring={null} hub /> {text.milestone}
        </span>
        <span class="flex items-center gap-2.5">
          <span class="px-1">
            <Dot
              colour={domainColours[domains[0]] ?? '#d4d4d4'}
              ring={domainColours[domains[2] ?? domains[1]] ?? '#a3a3a3'}
              hub={false}
            />
          </span>
          {text.otherDomain}
        </span>
        <span class="hidden items-center gap-2 sm:flex">
          <span class="rounded-full border border-neutral-600 bg-neutral-800 px-1.5 text-[10px] leading-4 text-neutral-200">
            +3
          </span>
          {text.moreHint}
        </span>
      </p>

      {/* ---- horizontal chart (sm and up) ---- */}
      <section
        ref={chartRef}
        aria-label={text.chart}
        class="relative hidden overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950 sm:block"
      >
        <div class="relative" style={{ width: LABEL_COL + h.width, minWidth: '100%' }}>
          {/* decade bands + gridlines, behind everything */}
          <div aria-hidden="true" class="pointer-events-none absolute inset-0">
            {ticks.slice(0, -1).map((t, i) => (
              <div
                class="absolute top-0 bottom-0"
                style={{
                  left: LABEL_COL + H_PAD + h.scale.at(t),
                  width: h.scale.at(ticks[i + 1]) - h.scale.at(t),
                  background: i % 2 ? 'rgba(255,255,255,0.045)' : 'transparent',
                }}
              />
            ))}
            {ticks.map((t) => (
              <div
                class="absolute bottom-0 border-l border-neutral-600/80"
                style={{ left: LABEL_COL + H_PAD + h.scale.at(t), top: 22 }}
              />
            ))}
          </div>
          {/* top axis: era strip, then decade labels */}
          <div aria-hidden="true" class="relative" style={{ height: TOP_AXIS }}>
            {bands.map((b) => (
              <div
                class="absolute top-0 h-5 overflow-hidden border-l-2 border-neutral-500 bg-neutral-900"
                style={{
                  left: LABEL_COL + H_PAD + h.scale.at(b.from),
                  width: h.scale.at(b.to) - h.scale.at(b.from),
                }}
              >
                <span class="absolute top-0.5 left-1.5 text-[10px] tracking-widest whitespace-nowrap text-neutral-400 uppercase">
                  {eraLabels[b.id]}
                </span>
              </div>
            ))}
            {ticks.map((t) => (
              <span
                class="absolute bottom-1 -translate-x-1/2 rounded bg-neutral-950 px-1 font-mono text-xs font-medium text-neutral-200"
                style={{ left: LABEL_COL + H_PAD + h.scale.at(t) }}
              >
                {t}
              </span>
            ))}
          </div>
          {h.lanes.map(({ lane, list, count, track, flip, chips, chipRow, height }) => (
            <div class="relative flex border-t border-neutral-800" style={{ height }}>
              <h2
                class="sticky left-0 z-10 flex shrink-0 items-start gap-2 border-r border-neutral-800 bg-neutral-950 px-3 pt-2 text-sm font-medium"
                style={{ width: LABEL_COL, color: domainColours[lane] }}
              >
                <span
                  aria-hidden="true"
                  class="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: domainColours[lane] }}
                />
                {domainLabels[lane] ?? lane}
                <span class="sr-only">({count})</span>
              </h2>
              <ul class="relative" style={{ width: h.width }}>
                {list.map((it) => {
                  const x = h.scale.at(it.year + 0.5);
                  const left = flip.has(it.id);
                  return (
                    <li
                      class="absolute flex items-center"
                      style={{
                        height: h.row,
                        top: LANE_PAD + track.get(it.id)! * h.row,
                        ...(left
                          ? { right: h.width - H_PAD - x - (it.hub ? 6 : 4) }
                          : { left: H_PAD + x - (it.hub ? 6 : 4) }),
                      }}
                    >
                      <a
                        href={it.href}
                        data-tl-item
                        class={`flex items-center gap-1.5 rounded px-0.5 whitespace-nowrap hover:text-white ${left ? 'flex-row-reverse' : ''} ${it.hub ? 'font-semibold text-neutral-50' : 'text-neutral-300'} ${sel?.id === it.id ? 'bg-neutral-800 text-white' : ''}`}
                        style={{ fontSize: it.hub ? h.font + 1 : h.font }}
                        aria-label={`${it.name}, ${it.year}`}
                        {...handlers(it)}
                      >
                        <Dot colour={domainColours[lane]} ring={ringOf(it, lane)} hub={it.hub} />
                        {it.name}
                      </a>
                    </li>
                  );
                })}
                {chips.map((c) => (
                  <li
                    class="absolute flex items-center"
                    style={{
                      height: h.row,
                      top: LANE_PAD + chipRow * h.row,
                      left: H_PAD + c.x - 6,
                    }}
                  >
                    <button
                      type="button"
                      data-tl-more
                      class={`rounded-full border px-1.5 text-[10px] leading-4 hover:border-neutral-300 hover:text-white ${more?.key === c.key ? 'border-neutral-300 bg-neutral-700 text-white' : 'border-neutral-600 bg-neutral-800 text-neutral-200'}`}
                      aria-expanded={more?.key === c.key && more.pinned}
                      aria-label={text.moreLabel.replace('{n}', String(c.ids.length))}
                      onClick={(e) =>
                        more?.key === c.key && more.pinned
                          ? setMore(null)
                          : openMore(c, e.currentTarget as HTMLElement, true)
                      }
                      onMouseEnter={(e) => {
                        if (!more?.pinned && matchMedia('(hover: hover)').matches)
                          openMore(c, e.currentTarget as HTMLElement, false);
                      }}
                      onMouseLeave={leaveMore}
                    >
                      +{c.ids.length}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {/* bottom axis */}
          <div
            aria-hidden="true"
            class="relative border-t border-neutral-700"
            style={{ height: BOTTOM_AXIS }}
          >
            {ticks.map((t) => (
              <span
                class="absolute top-1 -translate-x-1/2 rounded bg-neutral-950 px-1 font-mono text-xs font-medium text-neutral-200"
                style={{ left: LABEL_COL + H_PAD + h.scale.at(t) }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---- "+N" chip list ---- */}
      {more && (
        <div
          data-tl-more
          role={more.pinned ? 'dialog' : 'tooltip'}
          class="fixed z-50 max-h-80 w-64 overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900/95 p-2 text-xs shadow-xl shadow-black/50 backdrop-blur"
          style={popStyle(more.x, more.y)}
          onMouseEnter={() => clearTimeout(moreTimer.current)}
          onMouseLeave={leaveMore}
        >
          <ul class="space-y-0.5">
            {more.ids
              .map((id) => byId.get(id)!)
              .sort((a, b) => a.year - b.year || a.name.localeCompare(b.name))
              .map((it) => (
                <li>
                  <a
                    href={it.href}
                    class="flex items-baseline gap-2 rounded px-1.5 py-1 text-neutral-200 hover:bg-neutral-800 hover:text-white"
                    onClick={(e) => {
                      handlers(it).onClick(e);
                      setMore(null);
                    }}
                  >
                    <span class="font-mono text-[10px] text-neutral-500">{it.year}</span>
                    <span class={it.hub ? 'font-semibold' : ''}>{it.name}</span>
                  </a>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* ---- vertical chart (phones) ---- */}
      <section
        aria-label={text.chart}
        class="relative rounded-lg border border-neutral-800 bg-neutral-950 sm:hidden"
      >
        {!single && <p class="px-3 pt-3 text-xs text-neutral-500">{text.mobileHint}</p>}
        <div class="sticky top-0 z-10 flex border-b border-neutral-800 bg-neutral-950/95 backdrop-blur">
          <span style={{ width: AXIS_COL }} class="shrink-0" />
          {[...lanes.keys()].map((lane) => (
            <h2
              class="min-w-0 flex-1 truncate px-1 py-2 text-[11px] font-medium"
              style={{ color: domainColours[lane] }}
            >
              {domainLabels[lane] ?? lane}
            </h2>
          ))}
        </div>
        <div class="relative mt-3 flex" style={{ height: v.scale.length + 16 }}>
          <div aria-hidden="true" class="pointer-events-none absolute inset-0">
            {ticks.slice(0, -1).map((t, i) => (
              <div
                class="absolute right-0"
                style={{
                  left: AXIS_COL,
                  top: v.scale.at(t),
                  height: v.scale.at(ticks[i + 1]) - v.scale.at(t),
                  background: i % 2 ? 'rgba(255,255,255,0.045)' : 'transparent',
                }}
              />
            ))}
            {bands.map((b) => (
              <div
                class="absolute right-0 left-0 border-t border-neutral-500/70"
                style={{
                  top: v.scale.at(b.from),
                  height: v.scale.at(b.to) - v.scale.at(b.from),
                }}
              >
                <span
                  class="absolute top-1 left-0.5 text-[9px] tracking-widest whitespace-nowrap text-neutral-600 uppercase"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                >
                  {eraLabels[b.id]}
                </span>
              </div>
            ))}
            {ticks.map((t) => (
              <div
                class="absolute right-0 border-t border-neutral-600/80"
                style={{ top: v.scale.at(t), left: AXIS_COL }}
              >
                <span
                  class="absolute -top-2 font-mono text-[11px] font-medium text-neutral-200"
                  style={{ left: -AXIS_COL + 14 }}
                >
                  {t}
                </span>
              </div>
            ))}
          </div>
          <span style={{ width: AXIS_COL }} class="shrink-0" />
          {[...lanes].map(([lane, list]) => (
            <ul class="relative min-w-0 flex-1 border-l border-neutral-900">
              {list.map((it) => (
                <li
                  class="absolute right-0 left-0 flex h-5 items-center px-1"
                  style={{ top: v.pos.get(it.id) }}
                >
                  <a
                    href={it.href}
                    data-tl-item
                    class={`flex min-w-0 items-center gap-1 ${it.hub ? 'font-semibold text-neutral-50' : 'text-neutral-300'} ${single ? 'text-xs' : 'text-[10px]'}`}
                    aria-label={`${it.name}, ${it.year}`}
                    {...handlers(it)}
                  >
                    <Dot colour={domainColours[lane]} ring={ringOf(it, lane)} hub={it.hub} />
                    <span class="truncate">
                      {single && <span class="mr-1 font-mono text-neutral-500">{it.year}</span>}
                      {it.name}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      {/* ---- term panel (A80), once loaded ---- */}
      {panelKit && panelId && props.panel && (
        <div class="pointer-events-none fixed inset-0 z-40 [&>*]:pointer-events-auto">
          <panelKit.View
            {...props.panel}
            domainLabels={domainLabels}
            id={panelId}
            graph={panelKit.graph}
            onSelect={setPanelId}
            onClose={() => setPanelId(null)}
          />
        </div>
      )}

      {/* ---- summary popover ---- */}
      {selItem && sel && (
        <div
          ref={popRef}
          role={sel.pinned ? 'dialog' : 'tooltip'}
          aria-label={selItem.name}
          class="fixed inset-x-4 bottom-4 z-50 rounded-lg border border-neutral-700 bg-neutral-900/95 p-4 text-sm shadow-xl shadow-black/50 backdrop-blur sm:inset-x-auto sm:bottom-auto sm:w-80"
          style={popStyle(sel.x, sel.y)}
        >
          <div class="mb-1 flex items-baseline gap-2">
            <span class="font-mono text-xs text-neutral-500">{selItem.year}</span>
            <span class="font-semibold text-neutral-50">{selItem.name}</span>
          </div>
          <p class="mb-2 flex flex-wrap gap-2 text-[11px]">
            {selItem.domain.map((d) => (
              <span style={{ color: domainColours[d] }}>{domainLabels[d] ?? d}</span>
            ))}
          </p>
          {selItem.summary && <p class="mb-3 text-neutral-300">{selItem.summary}</p>}
          <div class="flex items-center justify-between">
            <a class="text-amber-400 hover:underline" href={selItem.href}>
              {text.openTerm} →
            </a>
            {sel.pinned && (
              <button
                type="button"
                class="text-xs text-neutral-400 hover:text-neutral-100"
                onClick={() => setSel(null)}
              >
                {text.close}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Desktop: below the term, kept on screen. Phones use the CSS bottom sheet instead. */
function popStyle(x: number, y: number): Record<string, string> | undefined {
  if (typeof window === 'undefined' || window.innerWidth < 640) return undefined;
  const left = Math.min(Math.max(8, x - 8), window.innerWidth - 336);
  const below = y + 8 + 180 < window.innerHeight;
  return below
    ? { left: `${left}px`, top: `${y + 8}px` }
    : { left: `${left}px`, bottom: `${window.innerHeight - y + 32}px` };
}
