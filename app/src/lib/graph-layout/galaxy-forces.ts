/**
 * The 3D galaxy layout's force simulation: repulsion, springs along relationships, the
 * pulls towards cluster, galaxy and depth, and a damped integration step.
 */
import { EXPLORER } from '../explorer-config';
import type { Paintable } from '../graph-style';

export type Point3 = { x: number; y: number; z: number };
export type Spring = { a: number; b: number; len: number; k: number };
/** Everything a simulation step reads and moves; `P` and `V` are updated in place. */
export type Galaxy = {
  nodes: Paintable[];
  P: Point3[];
  V: Point3[];
  springs: Spring[];
  /** Each term's galaxy centre (horizontal), and the height its depth pulls it to. */
  home: { x: number; z: number }[];
  targetY: number[];
};

const delta = (from: Point3, to: Point3): Point3 => ({
  x: to.x - from.x,
  y: to.y - from.y,
  z: to.z - from.z,
});

/** v += d × f, per component. */
const nudge = (v: Point3, d: Point3, f: number) => {
  v.x += d.x * f;
  v.y += d.y * f;
  v.z += d.z * f;
};

/** Repulsion, cut off beyond chargeCutoff so galaxies don't push each other apart. */
function repel(g: Galaxy, alpha: number): void {
  const cfg = EXPLORER.three;
  const cut2 = cfg.chargeCutoff * cfg.chargeCutoff;
  for (let i = 0; i < g.P.length; i++)
    for (let j = i + 1; j < g.P.length; j++) {
      const d = delta(g.P[i], g.P[j]);
      const d2 = d.x * d.x + d.y * d.y + d.z * d.z;
      if (d2 > cut2) continue;
      const d2s = Math.max(d2, 25);
      const f = (cfg.charge * alpha) / d2s / Math.sqrt(d2s);
      nudge(g.V[i], d, -f);
      nudge(g.V[j], d, f);
    }
}

/** Each relationship pulls (or pushes) its ends towards its rest length. */
function pullSprings(g: Galaxy, alpha: number): void {
  for (const s of g.springs) {
    const d = delta(g.P[s.a], g.P[s.b]);
    const len = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z) || 1;
    const f = ((len - s.len) * s.k * alpha) / len;
    nudge(g.V[s.a], d, f);
    nudge(g.V[s.b], d, -f);
  }
}

/** Sum of each cluster's positions, and its size. */
function clusterSums(g: Galaxy): Map<string, Point3 & { n: number }> {
  const sums = new Map<string, Point3 & { n: number }>();
  g.nodes.forEach((node, i) => {
    const c = sums.get(node.cluster) ?? { x: 0, y: 0, z: 0, n: 0 };
    c.x += g.P[i].x;
    c.y += g.P[i].y;
    c.z += g.P[i].z;
    c.n++;
    sums.set(node.cluster, c);
  });
  return sums;
}

/** Pull every term towards its cluster's centre, its galaxy's centre and its depth height. */
function pullHome(g: Galaxy, alpha: number): void {
  const cfg = EXPLORER.three;
  const sums = clusterSums(g);
  const k = cfg.clusterPull * alpha;
  g.nodes.forEach((node, i) => {
    const c = sums.get(node.cluster)!;
    const [P, V, home] = [g.P[i], g.V[i], g.home[i]];
    V.x += (c.x / c.n - P.x) * k;
    V.z += (c.z / c.n - P.z) * k;
    V.y += (c.y / c.n - P.y) * k * 0.5;
    V.x += (home.x - P.x) * cfg.domainPull * alpha;
    V.z += (home.z - P.z) * cfg.domainPull * alpha;
    V.y += (g.targetY[i] - P.y) * cfg.depthStrength;
  });
}

/** Damp every velocity and move each term by it. */
function integrate(g: Galaxy): void {
  g.P.forEach((P, i) => {
    const V = g.V[i];
    V.x *= 0.6;
    V.y *= 0.6;
    V.z *= 0.6;
    P.x += V.x;
    P.y += V.y;
    P.z += V.z;
  });
}

/** Run the simulation for `EXPLORER.three.ticks` steps, cooling as it goes. */
export function simulate(g: Galaxy): void {
  const ticks = EXPLORER.three.ticks;
  for (let step = 0; step < ticks; step++) {
    const alpha = 1 - step / ticks;
    repel(g, alpha);
    pullSprings(g, alpha);
    pullHome(g, alpha);
    integrate(g);
  }
}
