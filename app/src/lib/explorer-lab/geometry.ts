/**
 * Pure 3D geometry for the visual lab's (A96) 3D runtime: link curves (a quadratic
 * bezier bent sideways), grouping and centroids, and sub-domain cluster positions.
 */
export type Vec = { x: number; y: number; z: number };
const AXES = ['x', 'y', 'z'] as const;

/**
 * The bend point of a link from a to b: its midpoint pushed sideways in the ground plane
 * (x, z), `k` × the link's length (as explorer-3d bends its curves).
 */
export function bendPoint(a: Vec, b: Vec, k: number): Vec {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, b.y - a.y, dz) || 1;
  const sl = Math.hypot(dz, dx) || 1;
  return {
    x: (a.x + b.x) / 2 + (-dz / sl) * len * k,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2 + (dx / sl) * len * k,
  };
}

/** The point at t (0–1) on the quadratic bezier a → c → b, as [x, y, z]. */
export function quadAt(a: Vec, c: Vec, b: Vec, t: number): number[] {
  const u = 1 - t;
  return AXES.map((k) => u * u * a[k] + 2 * u * t * c[k] + t * t * b[k]);
}

/** The mean of the points at `ids`. */
export function centroid(ids: number[], ps: Vec[]): Vec {
  const c = { x: 0, y: 0, z: 0 };
  for (const i of ids) {
    c.x += ps[i].x / ids.length;
    c.y += ps[i].y / ids.length;
    c.z += ps[i].z / ids.length;
  }
  return c;
}

/** Item indices grouped by a key, in first-seen order. */
export function groupIndices<T>(items: T[], key: (item: T) => string): Map<string, number[]> {
  const out = new Map<string, number[]>();
  items.forEach((n, i) => out.set(key(n), [...(out.get(key(n)) ?? []), i]));
  return out;
}

/**
 * Sub-domain clusters: each cluster moves `spread` × away from its domain's centre and
 * shrinks to `tight` × about its own, so a domain becomes a group of sub-galaxies.
 * Writes into `ps` (a copy of `orig`); `domainOf` names a cluster's domain.
 */
export function subClusters(
  ps: Vec[],
  orig: Vec[],
  clusters: Map<string, number[]>,
  domains: Map<string, number[]>,
  domainOf: (i: number) => string,
  { spread, tight }: { spread: number; tight: number },
) {
  const domC = new Map([...domains].map(([d, ids]) => [d, centroid(ids, orig)]));
  for (const ids of clusters.values()) {
    const c = centroid(ids, orig);
    const d = domC.get(domainOf(ids[0]))!;
    for (const i of ids)
      for (const a of AXES) ps[i][a] = d[a] + (c[a] - d[a]) * spread + (orig[i][a] - c[a]) * tight;
  }
}
