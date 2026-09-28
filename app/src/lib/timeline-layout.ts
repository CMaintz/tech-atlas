/**
 * Timeline v2 chart geometry (A81): where every label, lane and "+N" chip goes for a
 * given zoom and screen, in both orientations. Pure — the island's hooks feed it
 * measurements and the chart components only paint what it returns.
 */
import {
  densityScale,
  fitPerYear,
  labelWidth,
  packCapped,
  shareRows,
  stretchScale,
  type Scale,
  type Span,
  type TimelineItem,
} from './timeline';

// Horizontal (desktop) geometry, px. Zoom 0 fits the whole axis into the chart's width;
// each step in multiplies the fitted px/year.
export const H_ZOOM = [1, 1.5, 2.2, 3.2, 4.6];
export const ROW_FIT = 17;
export const ROW = 22;
export const LANE_PAD = 6;
export const LABEL_COL = 116;
export const H_PAD = 16;
export const TOP_AXIS = 44;
export const BOTTOM_AXIS = 26;
export const CHIP_W = 34;
// Before the island measures: a typical desktop chart width and lane budget.
export const SSR_WIDTH = 1280;
export const SSR_BUDGET = 560;
// Vertical (small screens) geometry, px.
export const V_ZOOM = [4, 6, 10, 16, 22];
export const V_ITEM = 24; // one phone row (h-6): a 24px tap target, the WCAG 2.5.8 minimum
export const AXIS_COL = 44;

/** A term as the chart lays it out: hubs get a larger, bolder label. */
export type ChartItem = TimelineItem & { hub: boolean };
type RankedSpan = Span & { rank: number };

/** What the axis needs to know: range, zoom step and each year's load (see `yearLoad`). */
export type AxisInput = { start: number; end: number; zoom: number; load: Map<number, number> };

/**
 * One term's label along the axis: dot then name, placed by priority (hubs first, then
 * by degree). Near the right edge the label goes left of its dot (`flip`), so nothing
 * runs off the axis.
 */
export function labelSpan(it: ChartItem, scale: Scale, font: number) {
  const x = scale.at(it.year + 0.5);
  const w = labelWidth(it.name, it.hub ? font + 1 : font);
  const rank = it.hub ? -1e6 : -it.degree;
  if (x + 16 + w > scale.length + H_PAD)
    return { span: { id: it.id, start: x - 12 - w, end: x + 7, rank }, flip: true };
  return { span: { id: it.id, start: x - 7, end: x + 16 + w, rank }, flip: false };
}

/** A lane's labels, and how many rows it would need to show them all. */
type LaneSpans<T> = { lane: string; list: T[]; flip: Set<string>; spans: RankedSpan[] };

function laneSpans<T extends ChartItem>(lane: string, list: T[], scale: Scale, font: number) {
  const placed = list.map((it) => labelSpan(it, scale, font));
  const flip = new Set(placed.filter((p) => p.flip).map((p) => p.span.id));
  const spans = placed.map((p) => p.span);
  return { lane, list, flip, spans, need: packCapped(spans, Infinity, 6).tracks };
}

export type Chip = { key: string; x: number; ids: string[] };

/** Terms that did not fit, as "+N" chips: neighbours closer than a chip's width share one. */
export function groupChips(lane: string, overflow: { id: string; x: number }[]): Chip[] {
  const chips: Chip[] = [];
  for (const o of [...overflow].sort((a, b) => a.x - b.x)) {
    const last = chips.at(-1);
    if (last && o.x - last.x < CHIP_W) last.ids.push(o.id);
    else chips.push({ key: `${lane}:${o.id}`, x: o.x, ids: [o.id] });
  }
  return chips;
}

/** Packs spans into `rows`; a lane that overflows gives its last row to the chips. */
function packLane(spans: RankedSpan[], rows: number) {
  const packed = packCapped(spans, rows, 6);
  return packed.overflow.length ? packCapped(spans, rows - 1, 6) : packed;
}

export type HLane<T> = {
  lane: string;
  /** The terms that got a row (the rest are in `chips`). */
  list: T[];
  count: number;
  track: Map<string, number>;
  flip: Set<string>;
  chips: Chip[];
  chipRow: number;
  height: number;
};

/** A lane given its share of rows (at least 2): its rows, chips and height in px. */
function fitLane<T extends ChartItem>(l: LaneSpans<T>, rows: number, g: Geom): HLane<T> {
  const { scale, row } = g;
  const packed = packLane(l.spans, Math.max(2, rows));
  const chips = laneChips(l, packed.overflow, scale);
  const tracks = Math.max(1, packed.tracks) + (chips.length ? 1 : 0);
  return {
    lane: l.lane,
    list: l.list.filter((it) => packed.track.has(it.id)),
    count: l.list.length,
    track: packed.track,
    flip: l.flip,
    chips,
    chipRow: tracks - 1,
    height: tracks * row + LANE_PAD * 2,
  };
}

/** The lane's overflowed terms as chips, at their years' positions. */
function laneChips<T extends ChartItem>(l: LaneSpans<T>, overflow: string[], scale: Scale) {
  const year = new Map(l.list.map((it) => [it.id, it.year]));
  return groupChips(
    l.lane,
    overflow.map((id) => ({ id, x: scale.at(year.get(id)! + 0.5) })),
  );
}

/** A lane's axis and row height. */
type Geom = { scale: Scale; row: number };

export type HLayout<T> = {
  scale: Scale;
  lanes: HLane<T>[];
  width: number;
  row: number;
  font: number;
};

/**
 * The horizontal chart: the axis fits `avail` px at zoom 0; each lane gets a share of
 * the `budget` px of height, and labels that don't fit fold into "+N" chips.
 */
export function horizontalLayout<T extends ChartItem>(
  lanes: Map<string, T[]>,
  axis: AxisInput,
  avail: number,
  budget: number,
): HLayout<T> {
  const scale = horizontalScale(axis, avail);
  const row = axis.zoom === 0 ? ROW_FIT : ROW;
  const font = axis.zoom === 0 ? 11 : 12;
  const spans = [...lanes].map(([lane, list]) => laneSpans(lane, list, scale, font));
  const total = Math.floor((budget - lanes.size * LANE_PAD * 2) / row);
  const need = spans.map((l) => l.need);
  const rows = shareRows(need, total);
  const out = spans.map((l, i) => fitLane(l, rows[i], { scale, row }));
  return { scale, lanes: out, width: scale.length + H_PAD * 2, row, font };
}

/** The desktop axis: the whole range fits `avail` px (less the lane labels) at zoom 0. */
export function horizontalScale({ start, end, zoom, load }: AxisInput, avail: number): Scale {
  const perYear = fitPerYear(start, end, avail - LABEL_COL - H_PAD * 2 - 2, load) * H_ZOOM[zoom];
  return densityScale(start, end, perYear, load);
}

/**
 * The vertical (phone) chart: a stretch axis so that each lane's terms for a year
 * stack cleanly, one `V_ITEM` row each. `pos` is each term's top in px.
 */
export function verticalLayout(lanes: Map<string, TimelineItem[]>, axis: AxisInput) {
  const { start, end, zoom, load } = axis;
  const scale = stretchScale(start, end, V_ZOOM[zoom], (y) =>
    load.has(y) ? load.get(y)! * V_ITEM + 4 : 0,
  );
  const pos = new Map<string, number>();
  for (const list of lanes.values()) stackYears(list, scale, pos);
  return { scale, pos };
}

/** Same-year terms (the list is chronological) one row below the other. */
function stackYears(list: TimelineItem[], scale: Scale, pos: Map<string, number>) {
  let prevYear = NaN;
  let k = 0;
  for (const it of list) {
    k = it.year === prevYear ? k + 1 : 0;
    prevYear = it.year;
    pos.set(it.id, scale.at(it.year) + 2 + k * V_ITEM);
  }
}
