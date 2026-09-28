import { BOTTOM_AXIS, H_PAD, LABEL_COL, TOP_AXIS } from '../../lib/timeline-layout';
import type { Scale } from '../../lib/timeline';
import { useTimelineCtx } from './context';
import { stripe } from './Dot';
import { HorizontalLane } from './HorizontalLane';
import type { MoreList } from './use-more-list';
import type { ChartLayout } from './use-timeline';

type Band = ChartLayout['bands'][number];
type AxisProps = { scale: Scale; ticks: number[] };

/** A year's offset from the chart's left edge (past the lane labels). */
const xAt = (scale: Scale, year: number) => LABEL_COL + H_PAD + scale.at(year);

/** The swim-lane chart for wide screens: decades across, one lane per domain. */
export function HorizontalChart({ chart, more }: { chart: ChartLayout; more: MoreList }) {
  const { text } = useTimelineCtx();
  return (
    <section
      ref={chart.chartRef}
      aria-label={text.chart}
      class="relative hidden overflow-x-auto rounded-lg border border-border chart-surface sm:block"
    >
      <ChartBody chart={chart} more={more} />
    </section>
  );
}

function ChartBody({ chart, more }: { chart: ChartLayout; more: MoreList }) {
  const { h, ticks } = chart;
  return (
    <div class="relative" style={{ width: LABEL_COL + h.width, minWidth: '100%' }}>
      <Backdrop scale={h.scale} ticks={ticks} />
      <TopAxis scale={h.scale} ticks={ticks} bands={chart.bands} />
      {h.lanes.map((lane) => (
        <HorizontalLane lane={lane} layout={h} more={more} />
      ))}
      <BottomAxis scale={h.scale} ticks={ticks} />
    </div>
  );
}

/** Decade bands and gridlines, behind everything. */
function Backdrop({ scale, ticks }: AxisProps) {
  return (
    <div aria-hidden="true" class="pointer-events-none absolute inset-0">
      {ticks.slice(0, -1).map((t, i) => (
        <div
          class="absolute top-0 bottom-0"
          style={{
            left: xAt(scale, t),
            width: scale.at(ticks[i + 1]) - scale.at(t),
            background: stripe(i),
          }}
        />
      ))}
      {ticks.map((t) => (
        <div
          class="absolute bottom-0 border-l border-border-strong"
          style={{ left: xAt(scale, t), top: 22 }}
        />
      ))}
    </div>
  );
}

/** The top axis: era strip, then decade labels. */
function TopAxis({ scale, ticks, bands }: AxisProps & { bands: Band[] }) {
  return (
    <div aria-hidden="true" class="relative" style={{ height: TOP_AXIS }}>
      {bands.map((b) => (
        <EraBand band={b} scale={scale} />
      ))}
      <DecadeLabels scale={scale} ticks={ticks} edge="bottom-1" />
    </div>
  );
}

function EraBand({ band, scale }: { band: Band; scale: Scale }) {
  const { eraLabels } = useTimelineCtx();
  return (
    <div
      class="absolute top-0 h-5 overflow-hidden border-l-2 border-border-hover bg-surface"
      style={{ left: xAt(scale, band.from), width: scale.at(band.to) - scale.at(band.from) }}
    >
      <span class="absolute top-0.5 left-1.5 text-[10px] tracking-widest whitespace-nowrap text-muted uppercase">
        {eraLabels[band.id]}
      </span>
    </div>
  );
}

function BottomAxis(props: AxisProps) {
  return (
    <div
      aria-hidden="true"
      class="relative border-t border-border-strong"
      style={{ height: BOTTOM_AXIS }}
    >
      <DecadeLabels {...props} edge="top-1" />
    </div>
  );
}

/** The decade years along an axis; `edge` is the side of the axis they sit against. */
function DecadeLabels({ scale, ticks, edge }: AxisProps & { edge: 'top-1' | 'bottom-1' }) {
  return (
    <>
      {ticks.map((t) => (
        <span
          class={`absolute ${edge} -translate-x-1/2 rounded bg-(--chart-bg) px-1 font-mono text-xs font-medium text-fg-soft`}
          style={{ left: xAt(scale, t) }}
        >
          {t}
        </span>
      ))}
    </>
  );
}
