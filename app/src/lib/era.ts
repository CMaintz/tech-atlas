/**
 * Era helpers: laying Terms out by the year they entered use (SPEC §4 `era`).
 * Pure — shared by the Timeline page and the Explorer's Time layout.
 */

type Dated = { id: string; era?: number };

/** The decade a year falls in: 1995 → 1990. */
export const decadeOf = (year: number) => Math.floor(year / 10) * 10;

export type Decade<T> = { decade: number; items: T[] };

/**
 * Terms with an era, grouped by decade (oldest first; within a decade by year, then
 * by `nameOf`). Terms without an era are counted, not placed.
 */
export function groupByDecade<T extends Dated>(
  items: T[],
  nameOf: (t: T) => string = (t) => t.id,
): { decades: Decade<T>[]; undated: number } {
  const byDecade = new Map<number, T[]>();
  let undated = 0;
  for (const t of items) {
    if (t.era === undefined) {
      undated++;
      continue;
    }
    const d = decadeOf(t.era);
    byDecade.set(d, [...(byDecade.get(d) ?? []), t]);
  }
  const decades = [...byDecade.entries()]
    .sort(([a], [b]) => a - b)
    .map(([decade, list]) => ({
      decade,
      items: list.sort((a, b) => a.era! - b.era! || nameOf(a).localeCompare(nameOf(b))),
    }));
  return { decades, undated };
}

export type TimeLayout = { pxPerYear?: number; rowGap?: number; laneGap?: number };

/**
 * Preset positions for a timeline graph: x = era, terms of the same year stacked
 * vertically (odd years staggered half a row). Terms without an era are parked in a grid to the left of
 * the earliest year, so they stay reachable without pretending to have a date.
 */
export function timePositions(
  nodes: Dated[],
  { pxPerYear = 40, rowGap = 60, laneGap = 160 }: TimeLayout = {},
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const dated = nodes.filter((n) => n.era !== undefined);
  const undated = nodes.filter((n) => n.era === undefined);
  const minEra = dated.length ? Math.min(...dated.map((n) => n.era!)) : 0;

  const byYear = new Map<number, Dated[]>();
  for (const n of dated) byYear.set(n.era!, [...(byYear.get(n.era!) ?? []), n]);
  for (const [year, list] of byYear) {
    list.sort((a, b) => a.id.localeCompare(b.id));
    list.forEach((n, i) => {
      // Odd years sit half a row lower so neighbouring years' labels don't collide.
      const stagger = (year % 2) * (rowGap / 2);
      positions[n.id] = {
        x: (year - minEra) * pxPerYear,
        y: (i - (list.length - 1) / 2) * rowGap + stagger,
      };
    });
  }

  const cols = Math.max(1, Math.ceil(Math.sqrt(undated.length)));
  const rows = Math.ceil(undated.length / cols);
  [...undated]
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((n, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions[n.id] = {
        x: -laneGap - (cols - 1 - col) * rowGap * 1.5,
        y: (row - (rows - 1) / 2) * rowGap,
      };
    });
  return positions;
}
