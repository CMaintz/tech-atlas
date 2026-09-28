/** The "By depth" layout (A86): one vertical lane per domain, depth rows across them. */
import { EXPLORER } from '../explorer-config';
import type { Point } from '../graph-style';
import { byDomain, type LaneLayout } from './lanes';
import { effectiveHome } from './visibility';
import type { LayoutNode, Link } from './types';

type DepthNode = LayoutNode & { depth: number };
/** rows[domain][depth] = the ordered ids in that lane's row. */
type Rows = Map<string, Map<number, string[]>>;
/** The lanes and rows of a depth layout, before anything is positioned. */
type Grid = {
  domains: string[];
  depths: number[];
  laneOf: Map<string, string>;
  rows: Rows;
  /** How many terms fit in one sub-row of each lane. */
  perRow: Map<string, number>;
};

/** Each term's neighbours, both ways; links to unknown terms are skipped. */
export function neighbourMap(nodes: LayoutNode[], links: Link[]): Map<string, string[]> {
  const neighbours = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const l of links) {
    if (!neighbours.has(l.source) || !neighbours.has(l.target)) continue;
    neighbours.get(l.source)!.push(l.target);
    neighbours.get(l.target)!.push(l.source);
  }
  return neighbours;
}

/** Terms per sub-row for a lane of `size` terms: about √size, at least four. */
const rowCapacity = (size: number) =>
  Math.max(4, Math.ceil(Math.sqrt(size) * EXPLORER.depth.wrapFactor));

const byClusterThenId = (a: LayoutNode, b: LayoutNode) =>
  a.cluster.localeCompare(b.cluster) || a.id.localeCompare(b.id);

/** Sort terms into lanes (by effective home) and rows (by depth), cluster by cluster. */
function buildGrid(nodes: DepthNode[], enabled?: ReadonlySet<string>): Grid {
  const laneOf = new Map(nodes.map((n) => [n.id, effectiveHome(n, enabled)]));
  const domains = [...new Set(laneOf.values())].sort(byDomain);
  const depths = [...new Set(nodes.map((n) => n.depth))].sort((a, b) => a - b);
  const rows: Rows = new Map(
    domains.map((d) => [d, new Map(depths.map((k) => [k, [] as string[]]))]),
  );
  for (const n of [...nodes].sort(byClusterThenId))
    rows.get(laneOf.get(n.id)!)!.get(n.depth)!.push(n.id);
  const laneSize = (d: string) => [...rows.get(d)!.values()].reduce((s, r) => s + r.length, 0);
  const perRow = new Map(domains.map((d) => [d, rowCapacity(laneSize(d))]));
  return { domains, depths, laneOf, rows, perRow };
}

/** Record each term's relative slot (0–1) in its row. */
const indexRow = (row: string[], slot: Map<string, number>) =>
  row.forEach((id, i) => slot.set(id, i / (row.length || 1)));

/** Mean slot of a term's neighbours in its own lane (its own slot when it has none). */
function barycentre(
  id: string,
  lane: string,
  grid: Grid,
  near: Map<string, string[]>,
  slot: Map<string, number>,
): number {
  const inLane = near
    .get(id)!
    .filter((o) => grid.laneOf.get(o) === lane && slot.has(o) && o !== id);
  return inLane.length
    ? inLane.reduce((a, o) => a + slot.get(o)!, 0) / inLane.length
    : slot.get(id)!;
}

/**
 * Order terms inside rows by the barycentre of their neighbours in the rows below and
 * above, sweeping up and down a few times, which cuts edge crossings.
 */
function orderRows(grid: Grid, near: Map<string, string[]>): void {
  const slot = new Map<string, number>();
  for (const lane of grid.rows.values()) for (const row of lane.values()) indexRow(row, slot);
  for (let s = 0; s < EXPLORER.depth.sweeps; s++) {
    const order = s % 2 === 0 ? grid.depths : [...grid.depths].reverse();
    for (const k of order)
      for (const d of grid.domains) {
        const row = grid.rows.get(d)!.get(k)!;
        const bary = new Map(row.map((id) => [id, barycentre(id, d, grid, near, slot)]));
        row.sort((a, b) => bary.get(a)! - bary.get(b)! || a.localeCompare(b));
        indexRow(row, slot);
      }
  }
}

/**
 * Each depth row's y, shared by every lane so a depth reads straight across the map
 * (a row is as tall as its most wrapped lane), and the y just past the deepest row.
 */
function rowHeights(grid: Grid): { rowY: Map<number, number>; end: number } {
  const cfg = EXPLORER.depth;
  const subRows = (d: string, k: number) =>
    Math.max(1, Math.ceil(grid.rows.get(d)!.get(k)!.length / grid.perRow.get(d)!));
  const rowY = new Map<number, number>();
  let y = 0;
  for (const k of grid.depths) {
    const deepest = Math.max(...grid.domains.map((d) => subRows(d, k)));
    rowY.set(k, y);
    y -= cfg.rowGap + (deepest - 1) * cfg.subRowGap;
  }
  return { rowY, end: y };
}

/**
 * Position one lane's terms, starting at `x`: long rows wrap into staggered sub-rows,
 * each centred in the lane. Returns the lane's width.
 */
function placeLane(
  grid: Grid,
  d: string,
  x: number,
  rowY: Map<number, number>,
  positions: Record<string, Point>,
): number {
  const cfg = EXPLORER.depth;
  const per = grid.perRow.get(d)!;
  const width = (per - 1) * cfg.colGap;
  for (const k of grid.depths) {
    const row = grid.rows.get(d)!.get(k)!;
    row.forEach((id, i) => {
      const sub = Math.floor(i / per);
      const inSub = Math.min(per, row.length - sub * per);
      const col = i % per;
      positions[id] = {
        x: x + width / 2 + (col - (inSub - 1) / 2) * cfg.colGap + (sub % 2) * (cfg.colGap / 2),
        y: rowY.get(k)! - sub * cfg.subRowGap,
      };
    });
  }
  return width;
}

/**
 * "By depth" (A86): one vertical lane per domain, depth rows shared by every lane
 * (foundations at the bottom), long rows wrapped into sub-rows so lanes stay compact,
 * and terms ordered inside rows by the barycentre of their neighbours in the rows
 * below and above (a few sweeps), which cuts edge crossings.
 */
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
    y: rowY.get(k)!,
  }));
  return { positions, lanes, ticks, hidden: [] };
}

/**
 * Every lane, left to right in domain order, with its name just past `top` — the
 * deepest row's edge (foundations sit at y = 0, deeper rows above them).
 */
function placeLanes(grid: Grid, rowY: Map<number, number>, top: number) {
  const cfg = EXPLORER.depth;
  const positions: Record<string, Point> = {};
  const lanes: LaneLayout['lanes'] = [];
  let x = 0;
  for (const d of grid.domains) {
    const width = placeLane(grid, d, x, rowY, positions);
    lanes.push({ domain: d, x: x + width / 2, y: top - cfg.rowGap / 2 });
    x += width + cfg.laneGap;
  }
  return { positions, lanes };
}
