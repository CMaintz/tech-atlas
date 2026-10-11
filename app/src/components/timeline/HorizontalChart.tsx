import { BOTTOM_AXIS, H_PAD, LABEL_COL, TOP_AXIS } from '../../lib/timeline-layout';
import type { Scale } from '../../lib/timeline';
import { useTimelineCtx } from './context';
import { alternateDecadeShade } from './ink';
import { HorizontalLane } from './HorizontalLane';
import type { MoreList } from './use-more-list';
import type { ChartLayout } from './use-timeline';

type Band = ChartLayout['bands'][number];
type AxisProps = { scale: Scale; ticks: number[] };

const yearLeftOffset = (scale: Scale, year: number) => LABEL_COL + H_PAD + scale.at(year);

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
      <DecadeStripesAndGridlines scale={h.scale} ticks={ticks} />
      <EraStripAndDecadeAxis scale={h.scale} ticks={ticks} bands={chart.bands} />
      {h.lanes.map((lane) => (
        <HorizontalLane lane={lane} layout={h} more={more} />
      ))}
      <BottomAxis scale={h.scale} ticks={ticks} />
    </div>
  );
}

function DecadeStripesAndGridlines({ scale, ticks }: AxisProps) {
  return (
    <div aria-hidden="true" class="pointer-events-none absolute inset-0">
      <DecadeStripes scale={scale} ticks={ticks} />
      {ticks.map((t) => (
        <div
          class="absolute bottom-0 border-l border-border-strong"
          style={{ left: yearLeftOffset(scale, t), top: 22 }}
        />
      ))}
    </div>
  );
}

function DecadeStripes({ scale, ticks }: AxisProps) {
  return (
    <>
      {ticks.slice(0, -1).map((t, i) => (
        <div
          class="absolute top-0 bottom-0"
          style={{
            left: yearLeftOffset(scale, t),
            width: scale.at(ticks[i + 1]) - scale.at(t),
            background: alternateDecadeShade(i),
          }}
        />
      ))}
    </>
  );
}

function EraStripAndDecadeAxis({ scale, ticks, bands }: AxisProps & { bands: Band[] }) {
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
      style={{
        left: yearLeftOffset(scale, band.from),
        width: scale.at(band.to) - scale.at(band.from),
      }}
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

function DecadeLabels({ scale, ticks, edge }: AxisProps & { edge: 'top-1' | 'bottom-1' }) {
  return (
    <>
      {ticks.map((t) => (
        <span
          class={`absolute ${edge} -translate-x-1/2 rounded bg-(--chart-bg) px-1 font-mono text-xs font-medium text-fg-soft`}
          style={{ left: yearLeftOffset(scale, t) }}
        >
          {t}
        </span>
      ))}
    </>
  );
}
