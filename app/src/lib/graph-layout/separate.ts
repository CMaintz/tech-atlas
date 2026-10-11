type Pt = { x: number; y: number; z?: number };
type Offset = { dx: number; dy: number; dz: number; d: number };

const vectorBetween = (a: Pt, b: Pt): Offset => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = (b.z ?? 0) - (a.z ?? 0);
  return { dx, dy, dz, d: Math.sqrt(dx * dx + dy * dy + dz * dz) };
};

const splitDirection = (i: number, j: number): Offset => {
  const t = (i * 7 + j * 13) % 360;
  return { dx: Math.cos(t), dy: Math.sin(t), dz: 0, d: 1 };
};

type IndexedPair = { a: Pt; b: Pt; i: number; j: number };

export function pushApart({ a, b, i, j }: IndexedPair, want: number): boolean {
  const raw = vectorBetween(a, b);
  if (raw.d >= want) return false;
  const { dx, dy, dz, d } = raw.d < 1e-6 ? splitDirection(i, j) : raw;
  const k = ((want - d) / d) * 0.5 * 1.02;
  a.x -= dx * k;
  a.y -= dy * k;
  b.x += dx * k;
  b.y += dy * k;
  if (a.z !== undefined && b.z !== undefined) {
    a.z -= dz * k;
    b.z += dz * k;
  }
  return true;
}

function sweepAllPairs(pts: Pt[], min: (i: number, j: number) => number): boolean {
  let moved = false;
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++)
      if (pushApart({ a: pts[i], b: pts[j], i, j }, min(i, j))) moved = true;
  return moved;
}

export function separate(
  pts: { x: number; y: number; z?: number }[],
  min: (i: number, j: number) => number,
  sweeps = 80,
): void {
  for (let s = 0; s < sweeps; s++) if (!sweepAllPairs(pts, min)) return;
}
