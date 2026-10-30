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
