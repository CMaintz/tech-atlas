import { EXPLORER } from '../explorer-config';
import type { Point } from '../graph-style';
import { byDomain, type LaneLayout } from './lanes';
import { effectiveHome } from './visibility';
import type { LayoutNode } from './types';

type TimeNode = LayoutNode & { era?: number };
type DatedNode = LayoutNode & { era: number };

function yearX(year: number, minYear: number): number {
  const cfg = EXPLORER.time;
  const pivot = Math.max(minYear, cfg.compressBefore);
  if (year >= pivot)
    return (pivot - minYear) * cfg.pxPerYear * cfg.compressFactor + (year - pivot) * cfg.pxPerYear;
  return (year - minYear) * cfg.pxPerYear * cfg.compressFactor;
}

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

type LaneOrigin = { minYear: number; top: number };

function beeswarmLane(
  mine: DatedNode[],
  { minYear, top }: LaneOrigin,
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

function stackLanes(dated: DatedNode[], minYear: number, enabled?: ReadonlySet<string>) {
  const cfg = EXPLORER.time;
  const laneOf = new Map(dated.map((n) => [n.id, effectiveHome(n, enabled)]));
  const positions: Record<string, Point> = {};
  const lanes: LaneLayout['lanes'] = [];
  let top = 0;
  for (const d of [...new Set(laneOf.values())].sort(byDomain)) {
    const mine = dated.filter((n) => laneOf.get(n.id) === d);
    const deepest = beeswarmLane(mine, { minYear, top }, positions);
    lanes.push({ domain: d, x: -cfg.pxPerYear, y: top });
    top += deepest * cfg.stackGap + cfg.laneGap;
  }
  return { positions, lanes, bottom: top };
}

function yearTicks(minYear: number, maxYear: number, y: number): LaneLayout['ticks'] {
  const every = EXPLORER.time.tickEvery;
  const ticks: LaneLayout['ticks'] = [];
  for (let yr = Math.ceil(minYear / every) * every; yr <= maxYear; yr += every)
    ticks.push({ label: String(yr), x: yearX(yr, minYear), y });
  return ticks;
}

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
