import { useMemo, useState } from 'preact/hooks';
import { bandsWithin, decadeTicks, lanesOf, toggleDomain, yearLoad } from '../../lib/timeline';
import { horizontalLayout, verticalLayout } from '../../lib/timeline-layout';
import type { TimelineCtx } from './context';
import { inkOf } from './ink';
import type { TimelineEntry, TimelineProps } from './types';
import { useChartSize } from './use-chart-size';
import { useMoreList } from './use-more-list';
import { itemHandlers, useSelection } from './use-selection';
import { useTermPanel } from './use-term-panel';

const DEFAULT_ZOOM = 0;

/** Which domains' lanes are shown (all, to start). */
function useDomainFilter(domains: string[]) {
  const [shown, setShown] = useState<string[]>(domains);
  const toggle = (d: string) => setShown((cur) => toggleDomain(domains, cur, d));
  return { shown, toggle, all: () => setShown(domains) };
}

export type DomainFilter = ReturnType<typeof useDomainFilter>;

/** Both charts' geometry for the shown lanes at this zoom (the desktop one fits the screen). */
function useChartLayout(props: TimelineProps, shown: string[], zoom: number) {
  const { items } = props;
  const [start, end] = props.range;
  const size = useChartSize();
  const lanes = useMemo(() => lanesOf(items, shown), [items, shown]);
  const load = useMemo(() => yearLoad(lanes.values()), [lanes]);
  const axis = { start, end, zoom, load };
  const { avail, budget } = size;
  const h = useMemo(
    () => horizontalLayout(lanes, axis, avail, budget),
    [lanes, load, zoom, start, end, avail, budget],
  );
  const v = useMemo(() => verticalLayout(lanes, axis), [lanes, load, zoom, start, end]);
  const ticks = decadeTicks(start, end);
  return { chartRef: size.ref, lanes, h, v, ticks, bands: bandsWithin(start, end) };
}

export type ChartLayout = ReturnType<typeof useChartLayout>;

/** Everything the island keeps: filter, zoom, layout, the popovers and the term panel. */
export function useTimeline(props: TimelineProps) {
  const filter = useDomainFilter(props.domains);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const chart = useChartLayout(props, filter.shown, zoom);
  const byId = useMemo(() => new Map(props.items.map((i) => [i.id, i])), [props.items]);
  const selection = useSelection();
  const panel = useTermPanel(props.panel, selection.clear); // the panel replaces the popover
  const more = useMoreList([zoom, filter.shown]);
  const ctx = chartContext(props, itemHandlers(selection, panel), selection.sel?.id);
  return { filter, zoom, setZoom, chart, byId, selection, panel, more, ctx };
}

function chartContext(
  props: TimelineProps,
  item: TimelineCtx['item'],
  selId: string | undefined,
): TimelineCtx {
  const ink = inkOf(props.domainColours, props.domainColoursLight);
  const ringOf = (it: TimelineEntry, lane: string) => {
    const other = it.domain.find((d) => d !== lane);
    return other ? ink(other) : null;
  };
  const label = (d: string) => props.domainLabels[d] ?? d;
  return { ink, ringOf, label, text: props.text, eraLabels: props.eraLabels, item, selId };
}
