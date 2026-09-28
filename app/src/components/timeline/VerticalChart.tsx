import type { Scale } from '../../lib/timeline';
import { AXIS_COL } from '../../lib/timeline-layout';
import { useTimelineCtx } from './context';
import { Dot } from './Dot';
import { inkVars, stripe } from './ink';
import type { TimelineEntry } from './types';
import type { ChartLayout } from './use-timeline';

type Band = ChartLayout['bands'][number];

/** The chart for phones: years down the page, one narrow column per shown domain. */
export function VerticalChart({ chart, single }: { chart: ChartLayout; single: boolean }) {
  const { text } = useTimelineCtx();
  return (
    <section
      aria-label={text.chart}
      class="relative rounded-lg border border-border chart-surface sm:hidden"
    >
      {!single && <p class="px-3 pt-3 text-xs text-subtle">{text.mobileHint}</p>}
      <LaneHeads lanes={[...chart.lanes.keys()]} />
      <Columns chart={chart} single={single} />
    </section>
  );
}

function Columns({ chart, single }: { chart: ChartLayout; single: boolean }) {
  const { v, lanes } = chart;
  return (
    <div class="relative mt-3 flex" style={{ height: v.scale.length + 16 }}>
      <Backdrop scale={v.scale} ticks={chart.ticks} bands={chart.bands} />
      <span style={{ width: AXIS_COL }} class="shrink-0" />
      {[...lanes].map(([lane, list]) => (
        <Column lane={lane} list={list} pos={v.pos} single={single} />
      ))}
    </div>
  );
}

/** The sticky row of domain names over the columns. */
function LaneHeads({ lanes }: { lanes: string[] }) {
  const { ink, label } = useTimelineCtx();
  return (
    <div class="sticky top-0 z-10 flex border-b border-border bg-(--chart-bg)/95 backdrop-blur">
      <span style={{ width: AXIS_COL }} class="shrink-0" />
      {lanes.map((lane) => (
        <h2
          class="map-ink min-w-0 flex-1 truncate px-1 py-2 text-xs font-medium"
          style={`${inkVars(ink(lane))}color:var(--ink)`}
        >
          {label(lane)}
        </h2>
      ))}
    </div>
  );
}

/** Decade stripes, era bands (labelled sideways) and decade ticks, behind the columns. */
function Backdrop({ scale, ticks, bands }: { scale: Scale; ticks: number[]; bands: Band[] }) {
  return (
    <div aria-hidden="true" class="pointer-events-none absolute inset-0">
      {ticks.slice(0, -1).map((t, i) => (
        <div
          class="absolute right-0"
          style={{
            left: AXIS_COL,
            top: scale.at(t),
            height: scale.at(ticks[i + 1]) - scale.at(t),
            background: stripe(i),
          }}
        />
      ))}
      {bands.map((b) => (
        <EraBand band={b} scale={scale} />
      ))}
      {ticks.map((t) => (
        <Tick year={t} scale={scale} />
      ))}
    </div>
  );
}

function EraBand({ band, scale }: { band: Band; scale: Scale }) {
  const { eraLabels } = useTimelineCtx();
  return (
    <div
      class="absolute right-0 left-0 border-t border-border-hover"
      style={{ top: scale.at(band.from), height: scale.at(band.to) - scale.at(band.from) }}
    >
      <span
        class="absolute top-1 left-0.5 text-[10px] tracking-widest whitespace-nowrap text-subtle uppercase"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        {eraLabels[band.id]}
      </span>
    </div>
  );
}

function Tick({ year, scale }: { year: number; scale: Scale }) {
  return (
    <div
      class="absolute right-0 border-t border-border-strong"
      style={{ top: scale.at(year), left: AXIS_COL }}
    >
      <span
        class="absolute -top-2 font-mono text-[11px] font-medium text-fg-soft"
        style={{ left: -AXIS_COL + 14 }}
      >
        {year}
      </span>
    </div>
  );
}

type ColumnProps = {
  lane: string;
  list: TimelineEntry[];
  pos: Map<string, number>;
  single: boolean;
};

/** One domain's terms, each at its year; with a single domain shown, larger and dated. */
function Column({ lane, list, pos, single }: ColumnProps) {
  return (
    <ul class="relative min-w-0 flex-1 border-l border-border">
      {list.map((it) => (
        <li
          class="absolute right-0 left-0 flex h-6 items-center px-1"
          style={{ top: pos.get(it.id) }}
        >
          <ColumnTerm it={it} lane={lane} single={single} />
        </li>
      ))}
    </ul>
  );
}

function ColumnTerm({ it, lane, single }: { it: TimelineEntry; lane: string; single: boolean }) {
  const { ink, ringOf, item } = useTimelineCtx();
  return (
    <a
      href={it.href}
      data-tl-item
      class={`flex h-6 min-w-0 items-center gap-1 ${it.hub ? 'font-semibold text-fg' : 'text-fg-soft'} ${single ? 'text-sm' : 'text-[11px]'}`}
      aria-label={`${it.name}, ${it.year}`}
      {...item(it)}
    >
      <Dot colour={ink(lane)} ring={ringOf(it, lane)} hub={it.hub} />
      <span class="truncate">
        {single && <span class="mr-1 font-mono text-subtle">{it.year}</span>}
        {it.name}
      </span>
    </a>
  );
}
