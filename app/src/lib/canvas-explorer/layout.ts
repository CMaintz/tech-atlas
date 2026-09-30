/**
 * Where every term of the canvas lab (A91) sits and how big it is: domain regions on a
 * grid, cluster seats inside them, heights by depth, a short seeded relaxation, then the
 * spacing pass. Pure and deterministic (the seed fixes every random draw, in order).
 */
import { pageRank, sizeForRank } from '../graph-layout';
import { DOMAIN_HUES, homeDomain, isDirected, seededRandom, type Paintable } from '../graph-style';
import type { EdgeType } from '../../schema';
import { LAB, type Vec3 } from './config';
import { spaceOut } from './spacing';

export type LayoutNode = Paintable & { id: string; depth: number };
type Region = { x0: number; yMid: number; w: number; h: number };
type Seat = { x: number; z: number };

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
  const { seat, targetY } = seatsAndHeights(nodes, rand);
  const P = startPositions(nodes, seat, targetY, rand);
  relax(P, nodes, inClusterSprings(nodes, links), seat, targetY);
  const r = nodes.map((nd) => radius(nd.id));
  spaceOut(P, r, LAB.gap);
  return centred(nodes, P);
}

/** Per domain region: its clusters' seats and its terms' target heights. */
function seatsAndHeights(nodes: LayoutNode[], rand: () => number) {
  const members = domainMembers(nodes);
  const regions = domainRegions(members);
  const seat = new Map<string, Seat>();
  const targetY = new Array<number>(nodes.length);
  for (const [d, idx] of members) {
    seatClusters(nodes, idx, regions.get(d)!, seat);
    tierHeights(nodes, idx, regions.get(d)!, rand, targetY);
  }
  return { seat, targetY };
}

/** Term indices per home domain, the domains in canonical order. */
function domainMembers(nodes: LayoutNode[]): Map<string, number[]> {
  const domains = domainOrder(nodes.map((n) => homeDomain(n)));
  const members = new Map<string, number[]>(domains.map((d) => [d, []]));
  nodes.forEach((n, i) => members.get(homeDomain(n))!.push(i));
  return members;
}

/** The widest region in each grid column and the tallest in each row. */
function gridTracks(size: number[], cols: number) {
  const colW = Array.from({ length: cols }, (_, c) =>
    Math.max(0, ...size.filter((_, i) => i % cols === c)),
  );
  const rowH = Array.from({ length: Math.ceil(size.length / cols) }, (_, r) =>
    Math.max(
      0,
      ...size.filter((_, i) => Math.floor(i / cols) === r).map((w) => w * LAB.regionAspect),
    ),
  );
  return { colW, rowH };
}

/** Regions: a grid of domains, each about as wide as its terms need. */
function domainRegions(members: Map<string, number[]>): Map<string, Region> {
  const domains = [...members.keys()];
  const cols = Math.max(1, Math.ceil(Math.sqrt(domains.length)));
  const size = domains.map((d) => LAB.regionScale * Math.sqrt(members.get(d)!.length));
  const { colW, rowH } = gridTracks(size, cols);
  const before = (tracks: number[], k: number) =>
    tracks.slice(0, k).reduce((s, v) => s + v + LAB.domainGap, 0);
  return new Map(
    domains.map((d, di) => {
      const [col, row, w] = [di % cols, Math.floor(di / cols), size[di]];
      const x0 = before(colW, col) + (colW[col] - w) / 2;
      const yMid = before(rowH, row) + rowH[row] / 2;
      return [d, { x0, yMid, w, h: w * LAB.regionAspect }];
    }),
  );
}

/** Cluster seats: across the region in x, rows back to front in z. */
function seatClusters(nodes: LayoutNode[], idx: number[], reg: Region, seat: Map<string, Seat>) {
  const cs = [...new Set(idx.map((i) => nodes[i].cluster))].sort();
  const ccols = Math.max(1, Math.ceil(Math.sqrt(cs.length * 1.5)));
  const crows = Math.ceil(cs.length / ccols);
  cs.forEach((c, i) => {
    const cc = i % ccols;
    const cr = Math.floor(i / ccols);
    const shift = cr % 2 ? 0.5 : 0;
    seat.set(c, {
      x: reg.x0 + (reg.w * (cc + 0.5 + shift * (ccols > 1 ? 0.5 : 0))) / ccols,
      z: (cr - (crows - 1) / 2) * LAB.clusterDepth,
    });
  });
}

/** Height: foundations at the bottom of the region, the deepest terms at the top. */
function tierHeights(
  nodes: LayoutNode[],
  idx: number[],
  reg: Region,
  rand: () => number,
  targetY: number[],
) {
  const maxDepth = Math.max(1, ...idx.map((i) => nodes[i].depth));
  const tier = (reg.h * 0.8) / maxDepth;
  for (const i of idx)
    targetY[i] = reg.yMid + reg.h * 0.4 - (nodes[i].depth + (rand() - 0.5) * LAB.tierJitter) * tier;
}

/** Each term starts near its cluster's seat, scattered by the cluster's size. */
function startPositions(
  nodes: LayoutNode[],
  seat: Map<string, Seat>,
  targetY: number[],
  rand: () => number,
): Vec3[] {
  const clusterSize = new Map<string, number>();
  for (const n of nodes) clusterSize.set(n.cluster, (clusterSize.get(n.cluster) ?? 0) + 1);
  return nodes.map((n, i) => {
    const s = seat.get(n.cluster)!;
    const spread = 20 * Math.sqrt(clusterSize.get(n.cluster) ?? 1);
    return {
      x: s.x + (rand() - 0.5) * spread,
      y: targetY[i],
      z: s.z + (rand() - 0.5) * spread,
    };
  });
}

/** Index pairs of the links inside one cluster (the relaxation's springs). */
function inClusterSprings(
  nodes: LayoutNode[],
  links: { source: string; target: string }[],
): (readonly [number, number])[] {
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  return links
    .map((l) => [index.get(l.source), index.get(l.target)] as const)
    .filter((p): p is readonly [number, number] => p[0] !== undefined && p[1] !== undefined)
    .filter(([a, b]) => a !== b && nodes[a].cluster === nodes[b].cluster);
}

/** The seeded relaxation: springs, short-range repulsion, a pull back to seat and tier. */
function relax(
  P: Vec3[],
  nodes: LayoutNode[],
  springs: (readonly [number, number])[],
  seat: Map<string, Seat>,
  targetY: number[],
) {
  for (let step = 0; step < LAB.relaxSteps; step++) {
    const k = 1 - step / LAB.relaxSteps;
    pullSprings(P, springs, k);
    repel(P, k);
    settle(P, nodes, seat, targetY);
  }
}

/** A pull back towards each term's cluster seat (x, z) and its tier height (y). */
function settle(P: Vec3[], nodes: LayoutNode[], seat: Map<string, Seat>, targetY: number[]) {
  for (let i = 0; i < P.length; i++) {
    const s = seat.get(nodes[i].cluster)!;
    P[i].x += (s.x - P[i].x) * 0.04;
    P[i].z += (s.z - P[i].z) * 0.04;
    P[i].y += (targetY[i] - P[i].y) * LAB.tierPull;
  }
}

/** Springs inside a cluster (related terms close), with a rest length. */
function pullSprings(P: Vec3[], springs: (readonly [number, number])[], k: number) {
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
}

/** Short-range repulsion in 3D, so a cluster is a cloud rather than a knot. */
function repel(P: Vec3[], k: number) {
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) repelPair(P, i, j, k);
}

/** Push i and j apart if closer than the repel radius (less in height than across). */
function repelPair(P: Vec3[], i: number, j: number, k: number) {
  const reach = LAB.repelRadius;
  const dx = P[j].x - P[i].x;
  const dy = P[j].y - P[i].y;
  const dz = P[j].z - P[i].z;
  const d2 = dx * dx + dy * dy + dz * dz;
  if (d2 > reach * reach) return;
  const d = Math.sqrt(Math.max(d2, 1));
  const f = ((reach - d) * 0.05 * k) / d;
  P[i].x -= dx * f;
  P[i].z -= dz * f;
  P[j].x += dx * f;
  P[j].z += dz * f;
  P[i].y -= dy * f * 0.5;
  P[j].y += dy * f * 0.5;
}

/** Centre on the origin, so rotation turns the map about its middle. */
function centred(nodes: LayoutNode[], P: Vec3[]): Map<string, Vec3> {
  const n = P.length;
  const c = P.reduce((s, p) => ({ x: s.x + p.x / n, y: s.y + p.y / n, z: s.z + p.z / n }), {
    x: 0,
    y: 0,
    z: 0,
  });
  return new Map(
    nodes.map((nd, i) => [nd.id, { x: P[i].x - c.x, y: P[i].y - c.y, z: P[i].z - c.z }]),
  );
}
