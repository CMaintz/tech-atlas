import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  bandsWithin,
  decadeTicks,
  labelWidth,
  lanesOf,
  densityScale,
  packTracks,
  stretchScale,
  yearLoad,
  type TimelineItem,
} from '../lib/timeline';

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
}

// Horizontal (desktop) geometry, px.
const H_ZOOM = [8, 12, 18, 26, 38];
const ROW = 24;
const LANE_PAD = 10;
const LABEL_COL = 132;
const H_PAD = 24;
// Vertical (small screens) geometry, px.
const V_ZOOM = [2, 4, 6, 10, 16];
const V_ITEM = 20;
const AXIS_COL = 44;
const DEFAULT_ZOOM = 1;

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
        boxShadow: [ring ? `0 0 0 2px ${ring}` : '', hub ? `0 0 10px ${colour}` : '']
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
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const lanes = useMemo(() => lanesOf(items, shown), [items, shown]);
  const ticks = decadeTicks(start, end);
  const bands = bandsWithin(start, end);

  const ringOf = (it: TimelineEntry, lane: string) => {
    const other = it.domain.find((d) => d !== lane);
    return other ? (domainColours[other] ?? null) : null;
  };

  // ---- horizontal layout: linear axis, labels stacked into rows without overlap ----
  const load = useMemo(() => yearLoad(lanes.values()), [lanes]);
  const h = useMemo(() => {
    const scale = densityScale(start, end, H_ZOOM[zoom], load);
    // Labels may run past the last year; the canvas grows to hold the longest one.
    let reach = scale.length;
    const out = [...lanes].map(([lane, list]) => {
      const spans = list.map((it) => {
        const x = scale.at(it.year + 0.5);
        return { id: it.id, start: x - 7, end: x + 16 + labelWidth(it.name, it.hub ? 13 : 12) };
      });
      const { track, tracks } = packTracks(spans, 6);
      reach = Math.max(reach, ...spans.map((sp) => sp.end));
      return { lane, list, track, height: Math.max(1, tracks) * ROW + LANE_PAD * 2, scale };
    });
    return { scale, lanes: out, width: reach + H_PAD * 2 };
  }, [lanes, load, zoom, start, end]);

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
      if (sel?.id === it.id && sel.pinned) setSel(null);
      else open(it.id, e.currentTarget as HTMLElement, true);
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
      <p class="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-neutral-500">
        <span class="flex items-center gap-2">
          <Dot colour="#d4d4d4" ring={null} hub /> {text.milestone}
        </span>
        <span class="flex items-center gap-2">
          <Dot colour="#d4d4d4" ring="#737373" hub={false} /> {text.otherDomain}
        </span>
      </p>

      {/* ---- horizontal chart (sm and up) ---- */}
      <section
        aria-label={text.chart}
        class="relative hidden overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950 sm:block"
      >
        <div class="relative" style={{ width: LABEL_COL + h.width }}>
          {/* era bands + decade grid, behind everything */}
          <div aria-hidden="true" class="pointer-events-none absolute inset-0">
            {bands.map((b, i) => (
              <div
                class="absolute top-0 bottom-0 border-l border-neutral-800/60"
                style={{
                  left: LABEL_COL + H_PAD + h.scale.at(b.from),
                  width: h.scale.at(b.to) - h.scale.at(b.from),
                  background: i % 2 ? 'rgba(255,255,255,0.025)' : 'transparent',
                }}
              >
                <span class="absolute top-1.5 left-2 text-[10px] tracking-widest whitespace-nowrap text-neutral-500 uppercase">
                  {eraLabels[b.id]}
                </span>
              </div>
            ))}
            {ticks.map((t) => (
              <div
                class="absolute top-6 bottom-0 border-l border-dashed border-neutral-800"
                style={{ left: LABEL_COL + H_PAD + h.scale.at(t) }}
              />
            ))}
          </div>
          {/* top axis */}
          <div aria-hidden="true" class="relative h-12">
            {ticks.map((t) => (
              <span
                class="absolute bottom-1 -translate-x-1/2 font-mono text-xs text-neutral-400"
                style={{ left: LABEL_COL + H_PAD + h.scale.at(t) }}
              >
                {t}
              </span>
            ))}
          </div>
          {h.lanes.map(({ lane, list, track, height, scale }) => (
            <div class="relative flex border-t border-neutral-800" style={{ height }}>
              <h2
                class="sticky left-0 z-10 flex shrink-0 items-start gap-2 border-r border-neutral-800 bg-neutral-950 px-3 pt-3 text-sm font-medium"
                style={{ width: LABEL_COL, color: domainColours[lane] }}
              >
                <span
                  aria-hidden="true"
                  class="mt-1.5 inline-block h-2 w-2 rounded-full"
                  style={{ background: domainColours[lane] }}
                />
                {domainLabels[lane] ?? lane}
                <span class="sr-only">({list.length})</span>
              </h2>
              <ul class="relative" style={{ width: h.width }}>
                {list.map((it) => (
                  <li
                    class="absolute flex h-6 items-center"
                    style={{
                      left: H_PAD + scale.at(it.year + 0.5) - (it.hub ? 6 : 4),
                      top: LANE_PAD + track.get(it.id)! * ROW,
                    }}
                  >
                    <a
                      href={it.href}
                      data-tl-item
                      class={`flex items-center gap-1.5 rounded px-0.5 whitespace-nowrap hover:text-white ${it.hub ? 'text-[13px] font-semibold text-neutral-50' : 'text-xs text-neutral-300'} ${sel?.id === it.id ? 'bg-neutral-800 text-white' : ''}`}
                      aria-label={`${it.name}, ${it.year}`}
                      {...handlers(it)}
                    >
                      <Dot colour={domainColours[lane]} ring={ringOf(it, lane)} hub={it.hub} />
                      {it.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {/* bottom axis */}
          <div aria-hidden="true" class="relative h-8 border-t border-neutral-800">
            {ticks.map((t) => (
              <span
                class="absolute top-1.5 -translate-x-1/2 font-mono text-xs text-neutral-500"
                style={{ left: LABEL_COL + H_PAD + h.scale.at(t) }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

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
            {bands.map((b, i) => (
              <div
                class="absolute right-0 left-0 border-t border-neutral-800/60"
                style={{
                  top: v.scale.at(b.from),
                  height: v.scale.at(b.to) - v.scale.at(b.from),
                  background: i % 2 ? 'rgba(255,255,255,0.025)' : 'transparent',
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
                class="absolute right-0 border-t border-dashed border-neutral-800"
                style={{ top: v.scale.at(t), left: AXIS_COL }}
              >
                <span
                  class="absolute -top-2 font-mono text-[11px] text-neutral-400"
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
