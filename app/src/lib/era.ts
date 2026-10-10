type Dated = { id: string; era?: number };
type HasEra = { era: number };

const hasEra = <T extends Dated>(t: T): t is T & HasEra => t.era !== undefined;

export const decadeOf = (year: number) => Math.floor(year / 10) * 10;

export type Decade<T> = { decade: number; items: T[] };

export function groupByDecade<T extends Dated>(
  items: T[],
  nameOf: (t: T) => string = (t) => t.id,
): { decades: Decade<T>[]; undated: number } {
  const dated = items.filter(hasEra);
  const decades = [...groupBy(dated, (t) => decadeOf(t.era)).entries()]
    .sort(([a], [b]) => a - b)
    .map(([decade, list]) => ({
      decade,
      items: list.sort((a, b) => a.era - b.era || nameOf(a).localeCompare(nameOf(b))),
    }));
  return { decades, undated: items.length - dated.length };
}

function groupBy<T, K>(items: T[], keyOf: (t: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const t of items) {
    const k = keyOf(t);
    out.set(k, [...(out.get(k) ?? []), t]);
  }
  return out;
}

export type TimeLayout = { pxPerYear?: number; rowGap?: number; laneGap?: number };

export function timePositions(
  nodes: Dated[],
  { pxPerYear = 40, rowGap = 60, laneGap = 160 }: TimeLayout = {},
): Record<string, { x: number; y: number }> {
  const dated = nodes.filter(hasEra);
  const undated = nodes.filter((n) => n.era === undefined);
  return {
    ...datedPositions(dated, pxPerYear, rowGap),
    ...undatedGridLeftOfEarliest(undated, rowGap, laneGap),
  };
}

type Positions = Record<string, { x: number; y: number }>;
const byId = (a: Dated, b: Dated) => a.id.localeCompare(b.id);

function datedPositions(dated: (Dated & HasEra)[], pxPerYear: number, rowGap: number): Positions {
  const positions: Positions = {};
  const minEra = dated.length ? Math.min(...dated.map((n) => n.era)) : 0;
  for (const [year, list] of groupBy(dated, (n) => n.era)) {
    const oddYearStagger = (year % 2) * (rowGap / 2);
    list.sort(byId).forEach((n, i) => {
      positions[n.id] = {
        x: (year - minEra) * pxPerYear,
        y: (i - (list.length - 1) / 2) * rowGap + oddYearStagger,
      };
    });
  }
  return positions;
}

function undatedGridLeftOfEarliest(undated: Dated[], rowGap: number, laneGap: number): Positions {
  const positions: Positions = {};
  const cols = Math.max(1, Math.ceil(Math.sqrt(undated.length)));
  const rows = Math.ceil(undated.length / cols);
  [...undated].sort(byId).forEach((n, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions[n.id] = {
      x: -laneGap - (cols - 1 - col) * rowGap * 1.5,
      y: (row - (rows - 1) / 2) * rowGap,
    };
  });
  return positions;
}
