/**
 * Timeline v2 layout (A81): pure geometry for the
 * swim-lane timeline — axis scales, decade ticks, collision-free stacking, lane
 * assignment and milestone picking. No DOM, so the page (SSR) and the island share it
 * and the tests pin it.
 */

/** A dated term as the timeline sees it. */
export type TimelineItem = {
  id: string;
  name: string;
  year: number;
  /** Domains in authored order. */
  domain: string[];
  /** The domain whose lane the term lives in when that domain is shown (its colour family). */
  home: string;
  degree: number;
};

// ---- Scales ------------------------------------------------------------------------

/** First and last year of the axis: whole decades around the data (1956..2025 → 1950..2030). */
export function axisRange(years: number[]): [number, number] {
  if (!years.length) return [2000, 2030];
  const lo = Math.floor(Math.min(...years) / 10) * 10;
  const hi = Math.floor(Math.max(...years) / 10) * 10 + 10;
  return [lo, hi];
}

/** Decade ticks from `start` to `end` inclusive. */
export function decadeTicks(start: number, end: number): number[] {
  const ticks: number[] = [];
  for (let y = Math.ceil(start / 10) * 10; y <= end; y += 10) ticks.push(y);
  return ticks;
}

export type Scale = {
  /** Offset of the start of a year (fractional years allowed). */
  at: (year: number) => number;
  /** Total length of the axis. */
  length: number;
};

/**
 * Stretch scale: a year is at least `minPerYear` long, and long enough to hold
 * `need(year)` pixels (e.g. the tallest stack of entries that year). Monotone, so
 * decade ticks stay in order; crowded years get room instead of overlapping.
 */
export function stretchScale(
  start: number,
  end: number,
  minPerYear: number,
  need: (year: number) => number,
): Scale {
  const offsets = [0];
  for (let y = start; y < end; y++) offsets.push(offsets.at(-1)! + Math.max(minPerYear, need(y)));
  return {
    at: (y) => {
      const c = Math.min(Math.max(y, start), end);
      const i = Math.floor(c - start);
      if (i >= end - start) return offsets.at(-1)!;
      return offsets[i] + (offsets[i + 1] - offsets[i]) * (c - start - i);
    },
    length: offsets.at(-1)!,
  };
}

/**
 * The busiest lane's count of terms per year: how much room a year needs so that
 * crowded years spread out while empty stretches stay short.
 */
export function yearLoad(lanes: Iterable<{ year: number }[]>): Map<number, number> {
  const load = new Map<number, number>();
  for (const list of lanes) {
    const per = new Map<number, number>();
    for (const it of list) per.set(it.year, (per.get(it.year) ?? 0) + 1);
    for (const [y, c] of per) load.set(y, Math.max(load.get(y) ?? 0, c));
  }
  return load;
}

/**
 * The desktop axis: a year with no terms is `0.45 × perYear` wide, a year with terms
 * grows with its load. Density-weighted rather than linear so the empty 1950s–80s
 * don't push the crowded 2010s–20s off-screen; decade ticks show the (monotone) spacing.
 */
export const densityScale = (
  start: number,
  end: number,
  perYear: number,
  load: Map<number, number>,
): Scale =>
  stretchScale(start, end, perYear * 0.45, (y) =>
    load.has(y) ? perYear * (0.8 + 0.6 * load.get(y)!) : 0,
  );

// ---- Stacking ----------------------------------------------------------------------

export type Span = { id: string; start: number; end: number };

/**
 * Collision-free stacking: assigns every span a track (0, 1, 2 …) so that no two spans
 * on the same track overlap (with `gap` between them). Greedy first-fit in start order
 * (ties by id), which is optimal for interval graphs — the number of tracks equals the
 * largest number of spans overlapping any one point.
 */
export function packTracks(spans: Span[], gap = 0): { track: Map<string, number>; tracks: number } {
  const sorted = [...spans].sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
  const ends: number[] = [];
  const track = new Map<string, number>();
  for (const s of sorted) {
    let t = ends.findIndex((e) => e + gap <= s.start);
    if (t < 0) t = ends.push(0) - 1;
    ends[t] = s.end;
    track.set(s.id, t);
  }
  return { track, tracks: ends.length };
}

/**
 * Stacking under a row budget (A81, fit zoom): spans are placed in priority order
 * (lower `rank` first, e.g. hubs before the rest) on the first of `maxTracks` tracks
 * where they overlap nothing; a span that fits nowhere is returned in `overflow`
 * instead, for the caller to fold into a "+N" chip.
 */
export function packCapped(
  spans: (Span & { rank: number })[],
  maxTracks: number,
  gap = 0,
): { track: Map<string, number>; tracks: number; overflow: string[] } {
  const sorted = [...spans].sort(
    (a, b) => a.rank - b.rank || a.start - b.start || a.id.localeCompare(b.id),
  );
  const rows: Span[][] = [];
  const track = new Map<string, number>();
  const overflow: string[] = [];
  for (const s of sorted) {
    const free = (row: Span[]) =>
      row.every((o) => s.end + gap <= o.start || o.end + gap <= s.start);
    let t = rows.findIndex(free);
    if (t < 0 && rows.length < maxTracks) t = rows.push([]) - 1;
    if (t < 0) {
      overflow.push(s.id);
      continue;
    }
    rows[t].push(s);
    track.set(s.id, t);
  }
  return { track, tracks: rows.length, overflow };
}

/**
 * Shares `total` rows between lanes that need `need[i]` rows each: a lane that needs
 * less than an equal share keeps only what it needs, and the rest is split among the
 * others (water-filling), so a sparse lane doesn't waste the screen a busy one could use.
 */
export function shareRows(need: number[], total: number): number[] {
  const out = need.map(() => 0);
  let left = Math.max(0, total);
  const order = need.map((n, i) => ({ n, i })).sort((a, b) => a.n - b.n);
  order.forEach(({ n, i }, k) => {
    out[i] = Math.min(n, Math.floor(left / (order.length - k)));
    left -= out[i];
  });
  return out;
}

/**
 * The per-year width that fits the whole axis into `avail` px. `densityScale` is linear
 * in its per-year unit, so one unit-scale measurement gives the answer.
 */
export const fitPerYear = (start: number, end: number, avail: number, load: Map<number, number>) =>
  Math.max(1, avail / Math.max(1, densityScale(start, end, 1, load).length));

// ---- Lanes and milestones ------------------------------------------------------------

/**
 * Which visible lane a term sits in: its home domain if that lane is shown, else its
 * first shown domain; null when none of its domains is shown.
 */
export function laneOf(
  item: Pick<TimelineItem, 'domain' | 'home'>,
  shown: string[],
): string | null {
  if (shown.includes(item.home)) return item.home;
  return item.domain.find((d) => shown.includes(d)) ?? null;
}

/** Visible items grouped by lane (lanes in `shown` order), each chronological then by name. */
export function lanesOf<T extends TimelineItem>(items: T[], shown: string[]): Map<string, T[]> {
  const lanes = new Map<string, T[]>(shown.map((d) => [d, []]));
  for (const it of items) {
    const lane = laneOf(it, shown);
    if (lane) lanes.get(lane)!.push(it);
  }
  for (const list of lanes.values())
    list.sort((a, b) => a.year - b.year || a.name.localeCompare(b.name));
  return lanes;
}

/**
 * Milestones: the most connected terms (hubs), emphasised on the axis. The top
 * `share` of items by degree (at least one per lane-domain with any items), degree ≥ 1.
 */
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

/** Rough rendered width of a label in px (system sans at `fontPx`), for stacking. */
export const labelWidth = (text: string, fontPx = 12) => Math.ceil(text.length * fontPx * 0.56);

// ---- Eras ------------------------------------------------------------------------------

/** Background era bands: [from, to) in years. Labels live in site.ts (bilingual). */
export const ERA_BANDS = [
  { id: 'mainframe', from: 1950, to: 1975 },
  { id: 'networks', from: 1975, to: 1991 },
  { id: 'web', from: 1991, to: 2006 },
  { id: 'cloud', from: 2006, to: 2017 },
  { id: 'ai', from: 2017, to: 2100 },
] as const;

export type EraBandId = (typeof ERA_BANDS)[number]['id'];

/** Era bands clipped to the axis, dropping any that fall outside it. */
export function bandsWithin(start: number, end: number) {
  return ERA_BANDS.map((b) => ({
    ...b,
    from: Math.max(b.from, start),
    to: Math.min(b.to, end),
  })).filter((b) => b.from < b.to);
}
