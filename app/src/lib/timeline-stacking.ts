export type Span = { id: string; start: number; end: number };

export function packCapped(
  spans: (Span & { rank: number })[],
  maxTracks: number,
  gap = 0,
): { track: Map<string, number>; tracks: number; overflow: string[] } {
  const rows: Span[][] = [];
  const track = new Map<string, number>();
  const overflow: string[] = [];
  for (const s of [...spans].sort(byRank)) {
    const t = claimRow(rows, s, { maxTracks, gap });
    if (t < 0) overflow.push(s.id);
    else track.set(s.id, t);
  }
  return { track, tracks: rows.length, overflow };
}

const byRank = (a: Span & { rank: number }, b: Span & { rank: number }) =>
  a.rank - b.rank || a.start - b.start || a.id.localeCompare(b.id);

type RowBudget = { maxTracks: number; gap: number };

function claimRow(rows: Span[][], s: Span, { maxTracks, gap }: RowBudget): number {
  let t = rows.findIndex((row) =>
    row.every((o) => s.end + gap <= o.start || o.end + gap <= s.start),
  );
  if (t < 0 && rows.length < maxTracks) t = rows.push([]) - 1;
  if (t >= 0) rows[t].push(s);
  return t;
}

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
