import { getOrThrow } from '../map-get';

export type Vec = { x: number; y: number; z: number };
export type QuadCurve = { a: Vec; c: Vec; b: Vec };
export type TermGroups = {
  byCluster: Map<string, number[]>;
  byDomain: Map<string, number[]>;
  domainOf: (i: number) => string;
};
const AXES = ['x', 'y', 'z'] as const;

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

export function quadAt({ a, c, b }: QuadCurve, t: number): number[] {
  const u = 1 - t;
  return AXES.map((k) => u * u * a[k] + 2 * u * t * c[k] + t * t * b[k]);
}

export function centroid(ids: number[], ps: Vec[]): Vec {
  const c = { x: 0, y: 0, z: 0 };
  for (const i of ids) {
    c.x += ps[i].x / ids.length;
    c.y += ps[i].y / ids.length;
    c.z += ps[i].z / ids.length;
  }
  return c;
}

export function groupIndices<T>(items: T[], key: (item: T) => string): Map<string, number[]> {
  const out = new Map<string, number[]>();
  items.forEach((n, i) => out.set(key(n), [...(out.get(key(n)) ?? []), i]));
  return out;
}

export function subClusters(
  { ps, orig }: { ps: Vec[]; orig: Vec[] },
  { byCluster, byDomain, domainOf }: TermGroups,
  { spread, tight }: { spread: number; tight: number },
) {
  const domC = new Map([...byDomain].map(([d, ids]) => [d, centroid(ids, orig)]));
  for (const ids of byCluster.values()) {
    const c = centroid(ids, orig);
    const d = getOrThrow(domC, domainOf(ids[0]), 'domain centre');
    for (const i of ids)
      for (const a of AXES) ps[i][a] = d[a] + (c[a] - d[a]) * spread + (orig[i][a] - c[a]) * tight;
  }
}
