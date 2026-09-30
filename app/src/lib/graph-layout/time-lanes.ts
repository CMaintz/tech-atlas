/** The "By time" layout (A86): x is the year, one horizontal lane per domain. */
import { EXPLORER } from '../explorer-config';
import type { Point } from '../graph-style';
import { byDomain, type LaneLayout } from './lanes';
import { effectiveHome } from './visibility';
import type { LayoutNode } from './types';

type TimeNode = LayoutNode & { era?: number };
type DatedNode = LayoutNode & { era: number };

/** x for a year: linear, with the sparse early decades compressed. */
export function yearX(year: number, minYear: number): number {
  const cfg = EXPLORER.time;
  const pivot = Math.max(minYear, cfg.compressBefore);
  if (year >= pivot)
    return (pivot - minYear) * cfg.pxPerYear * cfg.compressFactor + (year - pivot) * cfg.pxPerYear;
  return (year - minYear) * cfg.pxPerYear * cfg.compressFactor;
}

/** The lowest stack slot at `x` that is clear of every placed term within a column. */
export function freeSlot(placed: Point[], x: number): number {
  const gap = EXPLORER.time.stackGap;
  const clash = (y: number) =>
    placed.some((p) => Math.abs(p.x - x) < gap && Math.abs(p.y - y) < gap / 2);
  let k = 0;
  while (clash(k * gap)) k++;
  return k;
}

const byEra = (a: DatedNode, b: DatedNode) =>
  a.era - b.era || a.cluster.localeCompare(b.cluster) || a.id.localeCompare(b.id);

/**
 * Greedy beeswarm for one lane whose top is at `top`: each term, oldest first, takes the
 * lowest slot free of any term within a column. Returns the deepest slot used.
 */
function stackLane(
  mine: DatedNode[],
  minYear: number,
  top: number,
  positions: Record<string, Point>,
): number {
  const gap = EXPLORER.time.stackGap;
  const placed: Point[] = [];
  let deepest = 0;
  for (const n of [...mine].sort(byEra)) {
    const x = yearX(n.era, minYear);
    const k = freeSlot(placed, x);
    placed.push({ x, y: k * gap });
    positions[n.id] = { x, y: top + k * gap };
    deepest = Math.max(deepest, k);
  }
  return deepest;
}

/** Every lane, stacked top to bottom in domain order; `bottom` is the y below the last. */
function stackLanes(dated: DatedNode[], minYear: number, enabled?: ReadonlySet<string>) {
  const cfg = EXPLORER.time;
  const laneOf = new Map(dated.map((n) => [n.id, effectiveHome(n, enabled)]));
  const positions: Record<string, Point> = {};
  const lanes: LaneLayout['lanes'] = [];
  let top = 0;
  for (const d of [...new Set(laneOf.values())].sort(byDomain)) {
    const mine = dated.filter((n) => laneOf.get(n.id) === d);
    const deepest = stackLane(mine, minYear, top, positions);
    lanes.push({ domain: d, x: -cfg.pxPerYear, y: top });
    top += deepest * cfg.stackGap + cfg.laneGap;
  }
  return { positions, lanes, bottom: top };
}

/** A tick every `tickEvery` years from `minYear` to `maxYear`, all at height `y`. */
export function yearTicks(minYear: number, maxYear: number, y: number): LaneLayout['ticks'] {
  const every = EXPLORER.time.tickEvery;
  const ticks: LaneLayout['ticks'] = [];
  for (let yr = Math.ceil(minYear / every) * every; yr <= maxYear; yr += every)
    ticks.push({ label: String(yr), x: yearX(yr, minYear), y });
  return ticks;
}

/**
 * "By time" (A86): x = the year a term entered use, one horizontal lane per domain,
 * terms of the same year (and near years) stacked into the nearest free slot of their
 * lane. Undated terms are left out (`hidden`), not piled into a grid.
 */
export function timeLanes(nodes: TimeNode[], enabled?: ReadonlySet<string>): LaneLayout {
  const dated = nodes.filter((n): n is DatedNode => n.era !== undefined);
  const hidden = nodes.filter((n) => n.era === undefined).map((n) => n.id);
  if (!dated.length) return { positions: {}, lanes: [], ticks: [], hidden };
  const minYear = Math.min(...dated.map((n) => n.era));
  const maxYear = Math.max(...dated.map((n) => n.era));
  const { positions, lanes, bottom } = stackLanes(dated, minYear, enabled);
  const ticks = yearTicks(minYear, maxYear, bottom - EXPLORER.time.laneGap / 2);
  return { positions, lanes, ticks, hidden };
}
