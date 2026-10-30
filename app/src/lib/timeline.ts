import { getOrThrow } from './map-get';

export type TimelineItem = {
  id: string;
  name: string;
  year: number;
  domain: string[];
  home: string;
  degree: number;
};

export function axisRange(years: number[]): [number, number] {
  if (!years.length) return [2000, 2030];
  const lo = Math.floor(Math.min(...years) / 10) * 10;
  const hi = Math.floor(Math.max(...years) / 10) * 10 + 10;
  return [lo, hi];
}

export function decadeTicks(start: number, end: number): number[] {
  const ticks: number[] = [];
  for (let y = Math.ceil(start / 10) * 10; y <= end; y += 10) ticks.push(y);
  return ticks;
}

export type Scale = {
  at: (year: number) => number;
  length: number;
};

type AxisYears = { start: number; end: number };

export function stretchScale(
  { start, end }: AxisYears,
  minPerYear: number,
  need: (year: number) => number,
): Scale {
  const offsets = [0];
  const total = () => offsets[offsets.length - 1];
  for (let y = start; y < end; y++) offsets.push(total() + Math.max(minPerYear, need(y)));
  return {
    at: (y) => {
      const c = Math.min(Math.max(y, start), end);
      const i = Math.floor(c - start);
      if (i >= end - start) return total();
      return offsets[i] + (offsets[i + 1] - offsets[i]) * (c - start - i);
    },
    length: total(),
  };
}

export function yearLoad(lanes: Iterable<{ year: number }[]>): Map<number, number> {
  const load = new Map<number, number>();
  for (const list of lanes) {
    const per = new Map<number, number>();
    for (const it of list) per.set(it.year, (per.get(it.year) ?? 0) + 1);
    for (const [y, c] of per) load.set(y, Math.max(load.get(y) ?? 0, c));
  }
  return load;
}

export const densityScale = (years: AxisYears, perYear: number, load: Map<number, number>): Scale =>
  stretchScale(years, perYear * 0.45, (y) => {
    const terms = load.get(y);
    return terms !== undefined ? perYear * (0.8 + 0.6 * terms) : 0;
  });

export const fitPerYear = (years: AxisYears, avail: number, load: Map<number, number>) =>
  Math.max(1, avail / Math.max(1, densityScale(years, 1, load).length));

export function laneOf(
  item: Pick<TimelineItem, 'domain' | 'home'>,
  shown: string[],
): string | null {
  if (shown.includes(item.home)) return item.home;
  return item.domain.find((d) => shown.includes(d)) ?? null;
}

export function lanesOf<T extends TimelineItem>(items: T[], shown: string[]): Map<string, T[]> {
  const lanes = new Map<string, T[]>(shown.map((d) => [d, []]));
  for (const it of items) {
    const lane = laneOf(it, shown);
    if (lane) getOrThrow(lanes, lane, 'timeline lane').push(it);
  }
  for (const list of lanes.values())
    list.sort((a, b) => a.year - b.year || a.name.localeCompare(b.name));
  return lanes;
}

export function toggleDomain(domains: string[], shown: string[], d: string): string[] {
  const next = shown.includes(d) ? shown.filter((x) => x !== d) : [...shown, d];
  return next.length ? domains.filter((x) => next.includes(x)) : domains;
}

export function milestones(items: TimelineItem[], share = 0.12): Set<string> {
  const ranked = [...items]
    .filter((i) => i.degree > 0)
    .sort((a, b) => b.degree - a.degree || a.id.localeCompare(b.id));
  const out = new Set(ranked.slice(0, Math.ceil(items.length * share)).map((i) => i.id));
  for (const d of new Set(items.map((i) => i.home))) {
    const top = ranked.find((i) => i.home === d);
    if (top) out.add(top.id);
  }
  return out;
}

export const labelWidth = (text: string, fontPx = 12) => Math.ceil(text.length * fontPx * 0.56);

const ERA_BANDS = [
  { id: 'mainframe', from: 1950, to: 1975 },
  { id: 'networks', from: 1975, to: 1991 },
  { id: 'web', from: 1991, to: 2006 },
  { id: 'cloud', from: 2006, to: 2017 },
  { id: 'ai', from: 2017, to: 2100 },
] as const;

export function bandsWithin(start: number, end: number) {
  return ERA_BANDS.map((b) => ({
    ...b,
    from: Math.max(b.from, start),
    to: Math.min(b.to, end),
  })).filter((b) => b.from < b.to);
}
