import { EXPLORER } from '../explorer-config';
import type { Point } from '../graph-style';
import { getOrThrow } from '../map-get';
import { byDomain, type LaneLayout } from './lanes';
import { effectiveHome } from './visibility';
import type { LayoutNode, Link } from './types';

type DepthNode = LayoutNode & { depth: number };
type Rows = Map<string, Map<number, string[]>>;
type Grid = {
  domains: string[];
  depths: number[];
  laneOf: Map<string, string>;
  rows: Rows;
  perRow: Map<string, number>;
};

const rowAt = (rows: Rows, domain: string, depth: number): string[] =>
  getOrThrow(getOrThrow(rows, domain, 'depth lane'), depth, 'depth row');

const perRowOf = (grid: Grid, domain: string) => getOrThrow(grid.perRow, domain, 'lane capacity');

export function neighbourMap(nodes: LayoutNode[], links: Link[]): Map<string, string[]> {
  const neighbours = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const l of links) {
    const fromSource = neighbours.get(l.source);
    const fromTarget = neighbours.get(l.target);
    if (!fromSource || !fromTarget) continue;
    fromSource.push(l.target);
    fromTarget.push(l.source);
  }
  return neighbours;
}

const rowCapacity = (size: number) =>
  Math.max(4, Math.ceil(Math.sqrt(size) * EXPLORER.depth.wrapFactor));

const byClusterThenId = (a: LayoutNode, b: LayoutNode) =>
  a.cluster.localeCompare(b.cluster) || a.id.localeCompare(b.id);

function buildGrid(nodes: DepthNode[], enabled?: ReadonlySet<string>): Grid {
  const laneOf = new Map(nodes.map((n) => [n.id, effectiveHome(n, enabled)]));
  const domains = [...new Set(laneOf.values())].sort(byDomain);
  const depths = [...new Set(nodes.map((n) => n.depth))].sort((a, b) => a - b);
  const rows: Rows = new Map(
    domains.map((d) => [d, new Map(depths.map((k) => [k, [] as string[]]))]),
  );
  for (const n of [...nodes].sort(byClusterThenId))
    rowAt(rows, getOrThrow(laneOf, n.id, 'term lane'), n.depth).push(n.id);
  const laneSize = (d: string) =>
    [...getOrThrow(rows, d, 'depth lane').values()].reduce((s, r) => s + r.length, 0);
  const perRow = new Map(domains.map((d) => [d, rowCapacity(laneSize(d))]));
  return { domains, depths, laneOf, rows, perRow };
}

const recordRelativeSlots = (row: string[], slot: Map<string, number>) =>
  row.forEach((id, i) => slot.set(id, i / (row.length || 1)));

type RowOrdering = { grid: Grid; near: Map<string, string[]>; slot: Map<string, number> };

function barycentre(id: string, lane: string, { grid, near, slot }: RowOrdering): number {
  const inLane = getOrThrow(near, id, 'term neighbours').filter(
    (o) => grid.laneOf.get(o) === lane && slot.has(o) && o !== id,
  );
  return inLane.length
    ? inLane.reduce((a, o) => a + getOrThrow(slot, o, 'row slot'), 0) / inLane.length
    : getOrThrow(slot, id, 'row slot');
}

function orderRows(grid: Grid, near: Map<string, string[]>): void {
  const ordering: RowOrdering = { grid, near, slot: new Map() };
  for (const lane of grid.rows.values())
    for (const row of lane.values()) recordRelativeSlots(row, ordering.slot);
  for (let s = 0; s < EXPLORER.depth.sweeps; s++) {
    const order = s % 2 === 0 ? grid.depths : [...grid.depths].reverse();
    for (const k of order) for (const d of grid.domains) sortRowByBarycentre(ordering, d, k);
  }
}

function sortRowByBarycentre(ordering: RowOrdering, d: string, k: number) {
  const row = rowAt(ordering.grid.rows, d, k);
  const bary = new Map(row.map((id) => [id, barycentre(id, d, ordering)]));
  const baryOf = (id: string) => getOrThrow(bary, id, 'barycentre');
  row.sort((a, b) => baryOf(a) - baryOf(b) || a.localeCompare(b));
  recordRelativeSlots(row, ordering.slot);
}

function rowHeights(grid: Grid): { rowY: Map<number, number>; end: number } {
  const cfg = EXPLORER.depth;
  const subRows = (d: string, k: number) =>
    Math.max(1, Math.ceil(rowAt(grid.rows, d, k).length / perRowOf(grid, d)));
  const rowY = new Map<number, number>();
  let y = 0;
  for (const k of grid.depths) {
    const deepest = Math.max(...grid.domains.map((d) => subRows(d, k)));
    rowY.set(k, y);
    y -= cfg.rowGap + (deepest - 1) * cfg.subRowGap;
  }
  return { rowY, end: y };
}

type LanePlacement = { grid: Grid; rowY: Map<number, number>; positions: Record<string, Point> };
type RowSlots = { centre: Point; per: number };

function placeLane({ grid, rowY, positions }: LanePlacement, d: string, x: number): number {
  const per = perRowOf(grid, d);
  const width = (per - 1) * EXPLORER.depth.colGap;
  for (const k of grid.depths) {
    const centre = { x: x + width / 2, y: getOrThrow(rowY, k, 'depth row y') };
    placeRow(rowAt(grid.rows, d, k), { centre, per }, positions);
  }
  return width;
}

function placeRow(row: string[], { centre, per }: RowSlots, positions: Record<string, Point>) {
  const cfg = EXPLORER.depth;
  row.forEach((id, i) => {
    const sub = Math.floor(i / per);
    const inSub = Math.min(per, row.length - sub * per);
    const col = i % per;
    positions[id] = {
      x: centre.x + (col - (inSub - 1) / 2) * cfg.colGap + (sub % 2) * (cfg.colGap / 2),
      y: centre.y - sub * cfg.subRowGap,
    };
  });
}

export function depthLanes(
  nodes: DepthNode[],
  links: Link[],
  enabled?: ReadonlySet<string>,
): LaneLayout {
  const grid = buildGrid(nodes, enabled);
  orderRows(grid, neighbourMap(nodes, links));
  const { rowY, end } = rowHeights(grid);
  const { positions, lanes } = placeLanes(grid, rowY, Math.min(end, 0));
  const ticks = grid.depths.map((k) => ({
    label: String(k),
    x: -EXPLORER.depth.laneGap / 2,
    y: getOrThrow(rowY, k, 'depth row y'),
  }));
  return { positions, lanes, ticks, hidden: [] };
}

function placeLanes(grid: Grid, rowY: Map<number, number>, top: number) {
  const cfg = EXPLORER.depth;
  const placement: LanePlacement = { grid, rowY, positions: {} };
  const lanes: LaneLayout['lanes'] = [];
  let x = 0;
  for (const d of grid.domains) {
    const width = placeLane(placement, d, x);
    lanes.push({ domain: d, x: x + width / 2, y: top - cfg.rowGap / 2 });
    x += width + cfg.laneGap;
  }
  return { positions: placement.positions, lanes };
}
