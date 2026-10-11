type Point = { x: number; y: number };
type CellGrid = Map<string, number[]>;
type DiscSpacing = { r: number[]; gap: number; cell: number };

export function spaceOut(P: Point[], r: number[], gap: number, maxPasses = 400): number {
  const spec = { r, gap, cell: 2 * Math.max(1, ...r) + gap };
  for (let pass = 1; pass <= maxPasses; pass++) if (!spacingPass(P, spec)) return pass;
  return maxPasses;
}

function spacingPass(P: Point[], { r, gap, cell }: DiscSpacing): boolean {
  const grid = cellGrid(P, cell);
  let moved = false;
  for (let i = 0; i < P.length; i++)
    for (const j of around(grid, P[i], cell))
      if (j > i && pushApart(P, [i, j], r[i] + r[j] + gap)) moved = true;
  return moved;
}

function cellGrid(P: Point[], cell: number): CellGrid {
  const grid: CellGrid = new Map();
  P.forEach((p, i) => {
    const key = `${Math.floor(p.x / cell)},${Math.floor(p.y / cell)}`;
    const list = grid.get(key);
    if (list) list.push(i);
    else grid.set(key, [i]);
  });
  return grid;
}

function around(grid: CellGrid, p: Point, cell: number): number[] {
  const cx = Math.floor(p.x / cell);
  const cy = Math.floor(p.y / cell);
  const out: number[] = [];
  for (let gx = cx - 1; gx <= cx + 1; gx++)
    for (let gy = cy - 1; gy <= cy + 1; gy++) out.push(...(grid.get(`${gx},${gy}`) ?? []));
  return out;
}

function pushApart(P: Point[], [i, j]: [number, number], min: number): boolean {
  let dx = P[j].x - P[i].x;
  let dy = P[j].y - P[i].y;
  let d = Math.hypot(dx, dy);
  if (d >= min - 1e-6) return false;
  if (d < 1e-6) {
    const a = ((i * 7 + j * 13) % 360) * (Math.PI / 180);
    [dx, dy, d] = [Math.cos(a), Math.sin(a), 1];
  }
  const push = ((min - d) / 2) * 1.02;
  P[i].x -= (dx / d) * push;
  P[i].y -= (dy / d) * push;
  P[j].x += (dx / d) * push;
  P[j].y += (dy / d) * push;
  return true;
}

export function minClearance(P: Point[], r: number[]): number {
  let best = Infinity;
  for (let i = 0; i < P.length; i++)
    for (let j = i + 1; j < P.length; j++)
      best = Math.min(best, Math.hypot(P[j].x - P[i].x, P[j].y - P[i].y) - r[i] - r[j]);
  return best;
}
