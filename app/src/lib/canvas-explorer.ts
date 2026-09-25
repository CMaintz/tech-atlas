/**
 * Pure maths for the canvas Explorer lab (A91): a hand-rolled 2D-context renderer with
 * "fake 3D" (the owner's Atlas.dc demo). Layout, minimum spacing, projection, the elastic
 * snap-back spring, the hit-test grid and the edge backbone live here — no DOM, no canvas,
 * deterministic and unit-tested. The component (CanvasExplorer.tsx) only draws.
 */
import { backbone, pageRank, sizeForRank } from './graph-layout';
import { DOMAIN_HUES, homeDomain, isDirected, seededRandom, type Paintable } from './graph-style';
import type { EdgeType } from '../schema';

export type Vec3 = { x: number; y: number; z: number };
type LayoutNode = Paintable & { id: string; depth: number };
type LayoutLink = { source: string; target: string; weight: number; family: string; type: string };

/** Every tunable number of the lab's layout and look, in one place. */
export const LAB = {
  seed: 20260925,
  /** Region width = this × √(terms in the domain); height = width × regionAspect. */
  regionScale: 46,
  regionAspect: 0.6,
  /** Each term's target height is spread ± half this many tiers (a band, not a floor). */
  tierJitter: 1.3,
  /** How hard the relaxation pulls a term to its depth height (0–1 per step). */
  tierPull: 0.12,
  /** Gap between two nodes' rims after the spacing pass (world units). */
  gap: 6,
  /** Gap between domain regions. */
  domainGap: 110,
  /** Distance between rows of cluster seats, front to back (z). */
  clusterDepth: 170,
  /** Terms closer than this push apart during the relaxation. */
  repelRadius: 46,
  relaxSteps: 90,
  /** Node radius = this × the Explorer's PageRank size. */
  radiusScale: 0.42,
  /** Perspective focal length (world units) in Depth mode. */
  focal: 1500,
  /** Terms whose rank is at least this share of the top keep a label. */
  hubShare: 0.16,
  /** Alpha of everything not connected to the selection. */
  dimAlpha: 0.2,
  /** Spring constant and damping of the elastic snap-back (per second²/per second). */
  spring: { k: 170, damping: 15 },
  /** Seconds a pulse takes to cross an edge of 200 px; longer edges take longer. */
  pulseSeconds: 3.2,
} as const;

/** Domains in the site's canonical order (DOMAIN_HUES), unknown ones last. */
export function domainOrder(domains: Iterable<string>): string[] {
  const known = Object.keys(DOMAIN_HUES);
  const rank = (d: string) => (known.includes(d) ? known.indexOf(d) : known.length);
  return [...new Set(domains)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** Node radius (world units) for every term, from PageRank as in the Explorer. */
export function radii(
  nodes: { id: string }[],
  links: { source: string; target: string; type: string }[],
): Map<string, { r: number; rank: number }> {
  const rank = pageRank(
    nodes.map((n) => n.id),
    links.map((l) => ({ ...l, directed: isDirected(l.type as EdgeType) })),
  );
  return new Map(
    nodes.map((n) => {
      const rk = rank.get(n.id) ?? 0;
      return [n.id, { r: (sizeForRank(rk) / 2) * (LAB.radiusScale * 2), rank: rk }];
    }),
  );
}

/**
 * Where every term sits (A91), computed once. Each domain is a region on a grid in the
 * front view (x, y), sized by its term count; a term shared by domains sits in its
 * primary (cluster's) domain. Inside a region, clusters get seats across x and back to
 * front in z (the depth you see when orbiting), and height is a soft pull towards Depth
 * (foundations low) with a spread. A short seeded relaxation draws related terms
 * together; `spaceOut` then guarantees no two nodes overlap in the front view.
 */
export function labLayout(
  nodes: LayoutNode[],
  links: { source: string; target: string }[],
  radius: (id: string) => number,
  seed: number = LAB.seed,
): Map<string, Vec3> {
  const rand = seededRandom(seed);
  const domains = domainOrder(nodes.map((n) => homeDomain(n)));
  const members = new Map<string, number[]>(domains.map((d) => [d, []]));
  nodes.forEach((n, i) => members.get(homeDomain(n))!.push(i));
  const clusterSize = new Map<string, number>();
  for (const n of nodes) clusterSize.set(n.cluster, (clusterSize.get(n.cluster) ?? 0) + 1);

  // Regions: a grid of domains, each about as wide as its terms need.
  const cols = Math.max(1, Math.ceil(Math.sqrt(domains.length)));
  const size = new Map(
    domains.map((d) => [d, LAB.regionScale * Math.sqrt(members.get(d)!.length)]),
  );
  const colW = Array.from({ length: cols }, (_, c) =>
    Math.max(0, ...domains.filter((_, i) => i % cols === c).map((d) => size.get(d)!)),
  );
  const rowH = Array.from({ length: Math.ceil(domains.length / cols) }, (_, r) =>
    Math.max(
      0,
      ...domains
        .filter((_, i) => Math.floor(i / cols) === r)
        .map((d) => size.get(d)! * LAB.regionAspect),
    ),
  );
  const seat = new Map<string, { x: number; z: number }>();
  const targetY = new Array<number>(nodes.length);
  domains.forEach((d, di) => {
    const col = di % cols;
    const row = Math.floor(di / cols);
    const w = size.get(d)!;
    const h = w * LAB.regionAspect;
    const x0 = colW.slice(0, col).reduce((s, v) => s + v + LAB.domainGap, 0) + (colW[col] - w) / 2;
    const yMid = rowH.slice(0, row).reduce((s, v) => s + v + LAB.domainGap, 0) + rowH[row] / 2;
    const idx = members.get(d)!;
    // Cluster seats: across the region in x, rows back to front in z.
    const cs = [...new Set(idx.map((i) => nodes[i].cluster))].sort();
    const ccols = Math.max(1, Math.ceil(Math.sqrt(cs.length * 1.5)));
    const crows = Math.ceil(cs.length / ccols);
    cs.forEach((c, i) => {
      const cc = i % ccols;
      const cr = Math.floor(i / ccols);
      const shift = cr % 2 ? 0.5 : 0;
      seat.set(c, {
        x: x0 + (w * (cc + 0.5 + shift * (ccols > 1 ? 0.5 : 0))) / ccols,
        z: (cr - (crows - 1) / 2) * LAB.clusterDepth,
      });
    });
    // Height: foundations at the bottom of the region, the deepest terms at the top.
    const maxDepth = Math.max(1, ...idx.map((i) => nodes[i].depth));
    const tier = (h * 0.8) / maxDepth;
    for (const i of idx)
      targetY[i] = yMid + h * 0.4 - (nodes[i].depth + (rand() - 0.5) * LAB.tierJitter) * tier;
  });

  const P = nodes.map((n, i) => {
    const s = seat.get(n.cluster)!;
    const spread = 20 * Math.sqrt(clusterSize.get(n.cluster) ?? 1);
    return {
      x: s.x + (rand() - 0.5) * spread,
      y: targetY[i],
      z: s.z + (rand() - 0.5) * spread,
    };
  });
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const springs = links
    .map((l) => [index.get(l.source), index.get(l.target)] as const)
    .filter((p): p is readonly [number, number] => p[0] !== undefined && p[1] !== undefined)
    .filter(([a, b]) => a !== b && nodes[a].cluster === nodes[b].cluster);
  const n = nodes.length;
  const reach = LAB.repelRadius;
  for (let step = 0; step < LAB.relaxSteps; step++) {
    const k = 1 - step / LAB.relaxSteps;
    // Springs inside a cluster (related terms close), with a rest length.
    for (const [a, b] of springs) {
      const dx = P[b].x - P[a].x;
      const dz = P[b].z - P[a].z;
      const d = Math.hypot(dx, dz) || 1;
      const f = ((d - 30) * 0.02 * k) / d;
      P[a].x += dx * f;
      P[a].z += dz * f;
      P[b].x -= dx * f;
      P[b].z -= dz * f;
    }
    // Short-range repulsion in 3D, so a cluster is a cloud rather than a knot.
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const dx = P[j].x - P[i].x;
        const dy = P[j].y - P[i].y;
        const dz = P[j].z - P[i].z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > reach * reach) continue;
        const d = Math.sqrt(Math.max(d2, 1));
        const f = ((reach - d) * 0.05 * k) / d;
        P[i].x -= dx * f;
        P[i].z -= dz * f;
        P[j].x += dx * f;
        P[j].z += dz * f;
        P[i].y -= dy * f * 0.5;
        P[j].y += dy * f * 0.5;
      }
    for (let i = 0; i < n; i++) {
      const s = seat.get(nodes[i].cluster)!;
      P[i].x += (s.x - P[i].x) * 0.04;
      P[i].z += (s.z - P[i].z) * 0.04;
      P[i].y += (targetY[i] - P[i].y) * LAB.tierPull;
    }
  }
  spaceOut(
    P,
    nodes.map((nd) => radius(nd.id)),
    LAB.gap,
  );
  // Centre on the origin, so rotation turns the map about its middle.
  const c = P.reduce((s, p) => ({ x: s.x + p.x / n, y: s.y + p.y / n, z: s.z + p.z / n }), {
    x: 0,
    y: 0,
    z: 0,
  });
  return new Map(
    nodes.map((nd, i) => [nd.id, { x: P[i].x - c.x, y: P[i].y - c.y, z: P[i].z - c.z }]),
  );
}

/**
 * Minimum spacing in the front view (x, y): push apart every pair whose discs (plus
 * `gap`) overlap, until none do. In place; returns the passes used. Clickability in the
 * Flat mode depends on this; in Depth mode rotation may still stack nodes, as in any 3D.
 */
export function spaceOut(
  P: { x: number; y: number }[],
  r: number[],
  gap: number,
  maxPasses = 400,
): number {
  const n = P.length;
  const maxR = Math.max(1, ...r);
  const cell = 2 * maxR + gap;
  for (let pass = 1; pass <= maxPasses; pass++) {
    const grid = new Map<string, number[]>();
    for (let i = 0; i < n; i++) {
      const key = `${Math.floor(P[i].x / cell)},${Math.floor(P[i].y / cell)}`;
      const list = grid.get(key);
      if (list) list.push(i);
      else grid.set(key, [i]);
    }
    let moved = false;
    for (let i = 0; i < n; i++) {
      const cx = Math.floor(P[i].x / cell);
      const cy = Math.floor(P[i].y / cell);
      for (let gx = cx - 1; gx <= cx + 1; gx++)
        for (let gy = cy - 1; gy <= cy + 1; gy++)
          for (const j of grid.get(`${gx},${gy}`) ?? []) {
            if (j <= i) continue;
            const min = r[i] + r[j] + gap;
            let dx = P[j].x - P[i].x;
            let dy = P[j].y - P[i].y;
            let d = Math.hypot(dx, dy);
            if (d >= min - 1e-6) continue;
            if (d < 1e-6) {
              // Coincident: separate along a fixed direction chosen from the pair.
              const a = ((i * 7 + j * 13) % 360) * (Math.PI / 180);
              dx = Math.cos(a);
              dy = Math.sin(a);
              d = 1;
            }
            // Slightly over-correct so the pass converges.
            const push = ((min - d) / 2) * 1.02;
            P[i].x -= (dx / d) * push;
            P[i].y -= (dy / d) * push;
            P[j].x += (dx / d) * push;
            P[j].y += (dy / d) * push;
            moved = true;
          }
    }
    if (!moved) return pass;
  }
  return maxPasses;
}

/** Smallest rim-to-rim distance between any two discs (for tests and diagnostics). */
export function minClearance(P: { x: number; y: number }[], r: number[]): number {
  let best = Infinity;
  for (let i = 0; i < P.length; i++)
    for (let j = i + 1; j < P.length; j++)
      best = Math.min(best, Math.hypot(P[j].x - P[i].x, P[j].y - P[i].y) - r[i] - r[j]);
  return best;
}

export type Camera = { yaw: number; pitch: number };
export type Projected = { x: number; y: number; z: number; s: number };

/**
 * Rotate a world point by yaw (about y) then pitch (about x) and apply a simple
 * perspective: `s` = focal / (focal + depth). yaw = pitch = 0 with `focal` = Infinity is
 * the flat front view (x, y unchanged, s = 1). `out` is reused to avoid allocation.
 */
export function project(
  p: Vec3,
  cam: Camera,
  focal: number,
  out: Projected = { x: 0, y: 0, z: 0, s: 1 },
): Projected {
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const x1 = p.x * cy - p.z * sy;
  const z1 = p.x * sy + p.z * cy;
  const y1 = p.y * cp - z1 * sp;
  const z2 = p.y * sp + z1 * cp;
  const s = Number.isFinite(focal) ? focal / Math.max(focal * 0.1, focal + z2) : 1;
  out.x = x1 * s;
  out.y = y1 * s;
  out.z = z2;
  out.s = s;
  return out;
}

/**
 * One step of the elastic snap-back: a damped spring pulling an offset to 0. Returns
 * the new offset and velocity; `dt` in seconds. Semi-implicit Euler (stable for small dt).
 */
export function springStep(
  offset: number,
  velocity: number,
  dt: number,
  k: number = LAB.spring.k,
  damping: number = LAB.spring.damping,
): [number, number] {
  const v = velocity + (-k * offset - damping * velocity) * dt;
  return [offset + v * dt, v];
}

/** True once a spring has come to rest (the loop can stop animating it). */
export const springAtRest = (offset: number, velocity: number) =>
  Math.abs(offset) < 0.05 && Math.abs(velocity) < 0.5;

/**
 * A uniform grid over screen positions for hit-testing: `nearest` returns the index of
 * the topmost disc under the point (the last drawn wins), or -1.
 */
export class HitGrid {
  private cells = new Map<number, number[]>();
  constructor(private cell = 40) {}
  private key = (cx: number, cy: number) => cx * 65536 + cy;
  build(xs: Float32Array, ys: Float32Array, rs: Float32Array, live: (i: number) => boolean) {
    this.cells.clear();
    for (let i = 0; i < xs.length; i++) {
      if (!live(i)) continue;
      const r = rs[i];
      const x0 = Math.floor((xs[i] - r) / this.cell);
      const x1 = Math.floor((xs[i] + r) / this.cell);
      const y0 = Math.floor((ys[i] - r) / this.cell);
      const y1 = Math.floor((ys[i] + r) / this.cell);
      for (let cx = x0; cx <= x1; cx++)
        for (let cy = y0; cy <= y1; cy++) {
          const k = this.key(cx, cy);
          const list = this.cells.get(k);
          if (list) list.push(i);
          else this.cells.set(k, [i]);
        }
    }
  }
  /** `order[i]` is i's draw position (higher = in front); `slop` widens tiny targets. */
  nearest(
    x: number,
    y: number,
    xs: Float32Array,
    ys: Float32Array,
    rs: Float32Array,
    order: Int32Array,
    slop = 4,
  ): number {
    const list = this.cells.get(this.key(Math.floor(x / this.cell), Math.floor(y / this.cell)));
    let best = -1;
    for (const i of list ?? []) {
      const reach = Math.max(rs[i], 7) + slop;
      if (Math.hypot(xs[i] - x, ys[i] - y) > reach) continue;
      if (best < 0 || order[i] > order[best]) best = i;
    }
    return best;
  }
}

/**
 * The default edge set (A91): every `requires` link plus the Explorer's backbone (each
 * term's strongest in-cluster links; graph.json folds an edge's strength into `weight`,
 * so "primary" edges are the heavy ones the backbone keeps). Indices into `links`.
 */
export function labBackbone(nodes: LayoutNode[], links: LayoutLink[], perNode = 2): Set<number> {
  const chosen = backbone(nodes, links, perNode);
  links.forEach((l, i) => {
    if (l.type === 'requires') chosen.add(i);
  });
  return chosen;
}

/** Pulse position (0–1 along the edge) at `ms`, for an edge `len` px long, phase 0–1. */
export function pulseAt(ms: number, len: number, phase: number): number {
  const period = LAB.pulseSeconds * 1000 * Math.max(0.6, Math.sqrt(len / 200));
  return (ms / period + phase) % 1;
}

/** A stable 0–1 phase for an edge, so pulses don't march in lockstep. */
export function phaseOf(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/** Terms whose name (or id) contains the query, best (prefix) matches first. */
export function searchTerms<T extends { id: string; term: Record<string, string> }>(
  nodes: T[],
  query: string,
  lang: string,
  limit = 8,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: [number, T][] = [];
  for (const n of nodes) {
    const name = (n.term[lang] ?? '').toLowerCase();
    const at = name.indexOf(q);
    const idAt = n.id.toLowerCase().indexOf(q);
    if (at < 0 && idAt < 0) continue;
    scored.push([name === q ? 0 : at === 0 ? 1 : at > 0 ? 2 : 3, n]);
  }
  return scored
    .sort((a, b) => a[0] - b[0] || a[1].term[lang].localeCompare(b[1].term[lang]))
    .slice(0, limit)
    .map(([, n]) => n);
}
