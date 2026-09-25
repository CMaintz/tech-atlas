/**
 * Pure graph maths for the Explorer (A86): the domain filter, which edges form the
 * overview backbone, PageRank for node size, cluster-to-cluster bundles, the "By depth"
 * and "By time" layouts, map orientation, overlap removal and the 3D galaxy layout.
 * No DOM, no Cytoscape, no three.js — everything here is deterministic and unit-tested.
 */
import { EXPLORER } from './explorer-config';
import {
  DOMAIN_HUES,
  domainColour,
  clusterColour,
  homeDomain,
  seededRandom,
  type Paintable,
  type Point,
} from './graph-style';

type Node = Paintable & { id: string };
type Link = { source: string; target: string };
type WeightedLink = Link & { weight: number; family: string };

// ---- Domain filter ------------------------------------------------------------------

/**
 * A term is visible when at least one of its domains is enabled (A86). A term shared by
 * two domains is one node: it stays while either is on. Nothing is ever shown merely
 * because it is connected to a visible term, and edges need both ends visible.
 */
export const termVisible = (n: { domain: string[] }, enabled: ReadonlySet<string>) =>
  n.domain.some((d) => enabled.has(d));

/**
 * The domain whose colour and region a term takes: its cluster's domain while that is
 * enabled, else its first enabled domain — so with Computer science off, a CS+security
 * term reads as security, not as a stray CS node.
 */
export function effectiveHome(n: Paintable, enabled?: ReadonlySet<string>): string {
  const home = homeDomain(n);
  if (!enabled || enabled.has(home)) return home;
  return n.domain.find((d) => enabled.has(d)) ?? home;
}

/** Fill and ring for a term given the enabled domains (rings only for enabled domains). */
export function effectivePaint(
  n: Paintable,
  enabled?: ReadonlySet<string>,
): { fill: string; ring: string | null } {
  const home = homeDomain(n);
  const eff = effectiveHome(n, enabled);
  const other = n.domain.find((d) => d !== eff && (!enabled || enabled.has(d)));
  return {
    fill: eff === home ? clusterColour(n.cluster, home) : domainColour(eff),
    ring: other ? domainColour(other) : null,
  };
}

/**
 * The domain colours of a term in several enabled domains (A86): its effective home
 * first, then the others. The map fills the term in its own shade and rings it in the
 * second colour. A term in one enabled domain gets none.
 */
export function domainBands(n: Paintable, enabled?: ReadonlySet<string>): string[] {
  const on = n.domain.filter((d) => !enabled || enabled.has(d));
  if (on.length < 2) return [];
  const home = effectiveHome(n, enabled);
  return [home, ...on.filter((d) => d !== home)].map(domainColour);
}

// ---- Backbone ------------------------------------------------------------------------

/** Relationship families that carry a map's structure (kind-of, part-of, requires …). */
const STRUCTURAL = new Set(['structure', 'dependency']);

/**
 * The overview's edges (A86): every `requires` edge and every edge authored
 * `strength: primary` is always drawn; each term also keeps its `perNode` strongest
 * relationships to terms sharing one of its domains, in any cluster (structure and
 * prerequisites count 1.5×) — so a hub whose links all leave its cluster still shows
 * them. A term left with none keeps its single strongest relationship, so no connected
 * term floats alone. Returns the indices of the chosen links.
 */
export function backbone(
  nodes: Node[],
  links: (WeightedLink & { type?: string; primary?: boolean })[],
  perNode: number = EXPLORER.edges.backbonePerNode,
): Set<number> {
  const domainsOf = new Map(nodes.map((n) => [n.id, n.domain]));
  const score = (l: WeightedLink) => l.weight * (STRUCTURAL.has(l.family) ? 1.5 : 1);
  const chosen = new Set<number>();
  const near = new Map<string, number[]>();
  const any = new Map<string, number[]>();
  const push = (m: Map<string, number[]>, k: string, i: number) => {
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(i);
  };
  links.forEach((l, i) => {
    if (l.type === 'requires' || l.primary) chosen.add(i);
    const b = domainsOf.get(l.target) ?? [];
    const shared = (domainsOf.get(l.source) ?? []).some((d) => b.includes(d));
    for (const end of [l.source, l.target]) {
      push(any, end, i);
      if (shared) push(near, end, i);
    }
  });
  const byScore = (a: number, b: number) => score(links[b]) - score(links[a]) || a - b;
  for (const n of nodes)
    for (const i of [...(near.get(n.id) ?? [])].sort(byScore).slice(0, perNode)) chosen.add(i);
  for (const n of nodes) {
    const mine = any.get(n.id) ?? [];
    if (mine.length && !mine.some((i) => chosen.has(i))) chosen.add([...mine].sort(byScore)[0]);
  }
  return chosen;
}

/**
 * The backbone over only the relationship families switched on, as indices into the
 * full `links`: a family that is off no longer takes a term's strongest-link slots, so
 * the families left on fill them.
 */
export function backboneOf(
  nodes: Node[],
  links: (WeightedLink & { type?: string; primary?: boolean })[],
  families: ReadonlySet<string>,
): Set<number> {
  const on = links.flatMap((l, i) => (families.has(l.family) ? [i] : []));
  const chosen = backbone(
    nodes,
    on.map((i) => links[i]),
  );
  return new Set([...chosen].map((j) => on[j]));
}

// ---- Centrality ----------------------------------------------------------------------

/**
 * PageRank over the relationships (authored direction; symmetric types count both
 * ways), normalised so the top term is 1. Terms that many others build on rank high.
 */
export function pageRank(
  ids: string[],
  links: (Link & { directed?: boolean })[],
  { damping = 0.85, iterations = 40 } = {},
): Map<string, number> {
  const n = ids.length;
  const index = new Map(ids.map((id, i) => [id, i]));
  const out: number[][] = ids.map(() => []);
  for (const l of links) {
    const a = index.get(l.source);
    const b = index.get(l.target);
    if (a === undefined || b === undefined) continue;
    out[a].push(b);
    if (l.directed === false) out[b].push(a);
  }
  let rank = new Array(n).fill(1 / Math.max(1, n));
  for (let it = 0; it < iterations; it++) {
    const next = new Array(n).fill((1 - damping) / n);
    let dangling = 0;
    for (let i = 0; i < n; i++) {
      if (!out[i].length) dangling += rank[i];
      else for (const j of out[i]) next[j] += (damping * rank[i]) / out[i].length;
    }
    for (let i = 0; i < n; i++) next[i] += (damping * dangling) / n;
    rank = next;
  }
  const max = Math.max(...rank, 1e-12);
  return new Map(ids.map((id, i) => [id, rank[i] / max]));
}

/** On-screen size for a normalised rank: √ so the long tail stays visible. */
export const sizeForRank = (r: number) =>
  EXPLORER.node.minSize + (EXPLORER.node.maxSize - EXPLORER.node.minSize) * Math.sqrt(r);

// ---- Bundles ---------------------------------------------------------------------------

/** Relationships between each pair of clusters, as one bundle per pair (a < b). */
export function clusterBundles(
  links: Link[],
  clusterOf: (id: string) => string | undefined,
  min: number = EXPLORER.edges.minBundle,
): { a: string; b: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const l of links) {
    const ca = clusterOf(l.source);
    const cb = clusterOf(l.target);
    if (!ca || !cb || ca === cb) continue;
    const key = ca < cb ? `${ca}\u0000${cb}` : `${cb}\u0000${ca}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= min)
    .sort(([x], [y]) => (x < y ? -1 : 1))
    .map(([k, count]) => {
      const [a, b] = k.split('\u0000');
      return { a, b, count };
    });
}

/**
 * Hierarchical edge bundling, lite: an edge between two islands bends through points
 * pulled (by `beta`) towards each island's centre, so edges between the same islands
 * share a path. Returned as Cytoscape `unbundled-bezier` control points: distances
 * perpendicular to the edge and weights along it.
 */
export function bundleControls(
  s: Point,
  t: Point,
  cs: Point,
  ct: Point,
  beta: number = EXPLORER.edges.bundleBeta,
): { distances: number[]; weights: number[] } {
  const along = (k: number) => ({ x: s.x + (t.x - s.x) * k, y: s.y + (t.y - s.y) * k });
  const pull = (p: Point, c: Point) => ({
    x: c.x * beta + p.x * (1 - beta),
    y: c.y * beta + p.y * (1 - beta),
  });
  return relativeControls(s, t, [pull(along(1 / 3), cs), pull(along(2 / 3), ct)]);
}

/** Absolute control points → Cytoscape's edge-relative distances and weights. */
export function relativeControls(
  s: Point,
  t: Point,
  points: Point[],
): { distances: number[]; weights: number[] } {
  const dx = t.x - s.x;
  const dy = t.y - s.y;
  const len2 = dx * dx + dy * dy || 1;
  const len = Math.sqrt(len2);
  const distances: number[] = [];
  const weights: number[] = [];
  for (const p of points) {
    const px = p.x - s.x;
    const py = p.y - s.y;
    weights.push((px * dx + py * dy) / len2);
    // Cytoscape measures distance to the right of the source → target direction.
    distances.push((px * dy - py * dx) / len);
  }
  return { distances, weights };
}

// ---- Orientation -------------------------------------------------------------------------------

/**
 * The rotation (radians) that lays a point cloud's long axis horizontal (principal
 * component), so a map fills a landscape screen instead of standing on end.
 */
export function levelAngle(points: Point[]): number {
  if (points.length < 2) return 0;
  const mx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const my = points.reduce((s, p) => s + p.y, 0) / points.length;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    syy += (p.y - my) ** 2;
    sxy += (p.x - mx) * (p.y - my);
  }
  const axis = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return -axis;
}

export const rotateAbout = (p: Point, c: Point, a: number): Point => ({
  x: c.x + (p.x - c.x) * Math.cos(a) - (p.y - c.y) * Math.sin(a),
  y: c.y + (p.x - c.x) * Math.sin(a) + (p.y - c.y) * Math.cos(a),
});

// ---- Overlap removal ------------------------------------------------------------------------

/**
 * Push points apart until every pair `i`, `j` is at least `min(i, j)` apart (A86), in
 * place, in 2D or 3D. Each sweep moves both points of a too-close pair half the
 * shortfall along the line between them; coincident points split along a fixed
 * direction, so the result is deterministic. A dense cluster grows instead of stacking
 * nodes on top of each other. O(n²) per sweep — run it per cluster, or on a few hundred
 * points.
 */
export function separate(
  pts: { x: number; y: number; z?: number }[],
  min: (i: number, j: number) => number,
  sweeps = 80,
): void {
  const n = pts.length;
  for (let s = 0; s < sweeps; s++) {
    let moved = false;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const a = pts[i];
        const b = pts[j];
        const want = min(i, j);
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dz = (b.z ?? 0) - (a.z ?? 0);
        let d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d >= want) continue;
        if (d < 1e-6) {
          // Coincident: split along a direction fixed by the pair's indices.
          const t = (i * 7 + j * 13) % 360;
          dx = Math.cos(t);
          dy = Math.sin(t);
          dz = 0;
          d = 1;
        }
        // A hair past the shortfall, so a pair does not settle just under its minimum.
        const k = ((want - d) / d) * 0.5 * 1.02;
        a.x -= dx * k;
        a.y -= dy * k;
        b.x += dx * k;
        b.y += dy * k;
        if (a.z !== undefined && b.z !== undefined) {
          a.z -= dz * k;
          b.z += dz * k;
        }
        moved = true;
      }
    if (!moved) return;
  }
}

// ---- Depth lanes ---------------------------------------------------------------------------

const domainOrder = (d: string) => {
  const listed = Object.keys(DOMAIN_HUES);
  return listed.includes(d) ? listed.indexOf(d) : listed.length;
};
const byDomain = (a: string, b: string) => domainOrder(a) - domainOrder(b) || a.localeCompare(b);

export type LaneLayout = {
  positions: Record<string, Point>;
  /** Where each lane's name goes (top centre of the lane). */
  lanes: { domain: string; x: number; y: number }[];
  /** Row labels: depth rows, or year ticks along the bottom. */
  ticks: { label: string; x: number; y: number }[];
  /** Terms the layout leaves out (undated terms in the time layout). */
  hidden: string[];
};

/**
 * "By depth" (A86): one vertical lane per domain, depth rows shared by every lane
 * (foundations at the bottom), long rows wrapped into sub-rows so lanes stay compact,
 * and terms ordered inside rows by the barycentre of their neighbours in the rows
 * below and above (a few sweeps), which cuts edge crossings.
 */
export function depthLanes(
  nodes: (Node & { depth: number })[],
  links: Link[],
  enabled?: ReadonlySet<string>,
): LaneLayout {
  const cfg = EXPLORER.depth;
  const laneOf = new Map(nodes.map((n) => [n.id, effectiveHome(n, enabled)]));
  const domains = [...new Set(laneOf.values())].sort(byDomain);
  const depths = [...new Set(nodes.map((n) => n.depth))].sort((a, b) => a - b);
  const neighbours = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const l of links) {
    if (!neighbours.has(l.source) || !neighbours.has(l.target)) continue;
    neighbours.get(l.source)!.push(l.target);
    neighbours.get(l.target)!.push(l.source);
  }
  // rows[domain][depth] = ordered ids
  const rows = new Map<string, Map<number, string[]>>();
  for (const d of domains) rows.set(d, new Map(depths.map((k) => [k, []])));
  for (const n of [...nodes].sort(
    (a, b) => a.cluster.localeCompare(b.cluster) || a.id.localeCompare(b.id),
  ))
    rows.get(laneOf.get(n.id)!)!.get(n.depth)!.push(n.id);
  const perRow = new Map(
    domains.map((d) => {
      const size = [...rows.get(d)!.values()].reduce((s, r) => s + r.length, 0);
      return [d, Math.max(4, Math.ceil(Math.sqrt(size) * cfg.wrapFactor))];
    }),
  );
  // Barycentric sweeps: order = mean slot of neighbours in the adjacent rows.
  const slot = new Map<string, number>();
  const index = () => {
    for (const lane of rows.values())
      for (const row of lane.values()) row.forEach((id, i) => slot.set(id, i / (row.length || 1)));
  };
  index();
  for (let s = 0; s < cfg.sweeps; s++) {
    const order = s % 2 === 0 ? depths : [...depths].reverse();
    for (const k of order)
      for (const d of domains) {
        const row = rows.get(d)!.get(k)!;
        const bary = new Map(
          row.map((id) => {
            const near = neighbours
              .get(id)!
              .filter((o) => laneOf.get(o) === d && slot.has(o) && o !== id);
            const v = near.length
              ? near.reduce((a, o) => a + slot.get(o)!, 0) / near.length
              : slot.get(id)!;
            return [id, v];
          }),
        );
        row.sort((a, b) => bary.get(a)! - bary.get(b)! || a.localeCompare(b));
        row.forEach((id, i) => slot.set(id, i / (row.length || 1)));
      }
  }
  // Row heights are shared by every lane, so a depth reads straight across the map.
  const subRows = (d: string, k: number) =>
    Math.max(1, Math.ceil(rows.get(d)!.get(k)!.length / perRow.get(d)!));
  const rowY = new Map<number, number>();
  let y = 0;
  for (const k of depths) {
    const deepest = Math.max(...domains.map((d) => subRows(d, k)));
    rowY.set(k, y);
    y -= cfg.rowGap + (deepest - 1) * cfg.subRowGap;
  }
  const positions: Record<string, Point> = {};
  const lanes: LaneLayout['lanes'] = [];
  let x = 0;
  for (const d of domains) {
    const width = (perRow.get(d)! - 1) * cfg.colGap;
    for (const k of depths) {
      const row = rows.get(d)!.get(k)!;
      row.forEach((id, i) => {
        const sub = Math.floor(i / perRow.get(d)!);
        const inSub = Math.min(perRow.get(d)!, row.length - sub * perRow.get(d)!);
        const col = i % perRow.get(d)!;
        positions[id] = {
          x: x + width / 2 + (col - (inSub - 1) / 2) * cfg.colGap + (sub % 2) * (cfg.colGap / 2),
          y: rowY.get(k)! - sub * cfg.subRowGap,
        };
      });
    }
    lanes.push({ domain: d, x: x + width / 2, y: Math.min(y, 0) - cfg.rowGap / 2 });
    x += width + cfg.laneGap;
  }
  const ticks = depths.map((k) => ({ label: String(k), x: -cfg.laneGap / 2, y: rowY.get(k)! }));
  return { positions, lanes, ticks, hidden: [] };
}

// ---- Time lanes ---------------------------------------------------------------------------

/** x for a year: linear, with the sparse early decades compressed. */
export function yearX(year: number, minYear: number): number {
  const cfg = EXPLORER.time;
  const pivot = Math.max(minYear, cfg.compressBefore);
  if (year >= pivot)
    return (pivot - minYear) * cfg.pxPerYear * cfg.compressFactor + (year - pivot) * cfg.pxPerYear;
  return (year - minYear) * cfg.pxPerYear * cfg.compressFactor;
}

/**
 * "By time" (A86): x = the year a term entered use, one horizontal lane per domain,
 * terms of the same year (and near years) stacked into the nearest free slot of their
 * lane. Undated terms are left out (`hidden`), not piled into a grid.
 */
export function timeLanes(
  nodes: (Node & { era?: number })[],
  enabled?: ReadonlySet<string>,
): LaneLayout {
  const cfg = EXPLORER.time;
  const dated = nodes.filter((n) => n.era !== undefined);
  const hidden = nodes.filter((n) => n.era === undefined).map((n) => n.id);
  if (!dated.length) return { positions: {}, lanes: [], ticks: [], hidden };
  const minYear = Math.min(...dated.map((n) => n.era!));
  const maxYear = Math.max(...dated.map((n) => n.era!));
  const laneOf = new Map(dated.map((n) => [n.id, effectiveHome(n, enabled)]));
  const domains = [...new Set(laneOf.values())].sort(byDomain);
  const positions: Record<string, Point> = {};
  const lanes: LaneLayout['lanes'] = [];
  let top = 0;
  for (const d of domains) {
    const mine = dated
      .filter((n) => laneOf.get(n.id) === d)
      .sort(
        (a, b) => a.era! - b.era! || a.cluster.localeCompare(b.cluster) || a.id.localeCompare(b.id),
      );
    // Greedy beeswarm: each term takes the lowest slot free of any term within a column.
    const placed: Point[] = [];
    let deepest = 0;
    for (const n of mine) {
      const x = yearX(n.era!, minYear);
      let k = 0;
      const clash = (yy: number) =>
        placed.some(
          (p) => Math.abs(p.x - x) < cfg.stackGap && Math.abs(p.y - yy) < cfg.stackGap / 2,
        );
      while (clash(k * cfg.stackGap)) k++;
      placed.push({ x, y: k * cfg.stackGap });
      positions[n.id] = { x, y: top + k * cfg.stackGap };
      deepest = Math.max(deepest, k);
    }
    lanes.push({ domain: d, x: -cfg.pxPerYear, y: top });
    top += deepest * cfg.stackGap + cfg.laneGap;
  }
  const ticks: LaneLayout['ticks'] = [];
  for (
    let yr = Math.ceil(minYear / cfg.tickEvery) * cfg.tickEvery;
    yr <= maxYear;
    yr += cfg.tickEvery
  )
    ticks.push({ label: String(yr), x: yearX(yr, minYear), y: top - cfg.laneGap / 2 });
  return { positions, lanes, ticks, hidden };
}

// ---- 3D galaxies ---------------------------------------------------------------------------

export type Point3 = { x: number; y: number; z: number };

/**
 * Where every term sits in 3D (A86), computed once from the whole graph: each domain is
 * a galaxy on a horizontal ring, each cluster a star system round its galaxy's centre,
 * terms spread by repulsion and drawn together by their relationships; a term in two
 * domains stays in its own cluster's galaxy. Height is a *soft* pull towards Depth (foundations low), never a plane.
 * Deterministic (seeded), O(n²) per step — fine for a few thousand terms.
 */
export function galaxyLayout(
  nodes: (Node & { depth: number })[],
  links: Link[],
  seed = 20260925,
): Map<string, Point3> {
  const cfg = EXPLORER.three;
  const rand = seededRandom(seed);
  const domains = [...new Set(nodes.map((n) => homeDomain(n)))].sort(byDomain);
  const anchor = new Map(
    domains.map((d, i) => {
      const a = (2 * Math.PI * i) / domains.length;
      return [d, { x: cfg.ringRadius * Math.cos(a), z: cfg.ringRadius * Math.sin(a) }];
    }),
  );
  const clustersOf = new Map<string, string[]>();
  for (const n of nodes) {
    const d = homeDomain(n);
    if (!clustersOf.has(d)) clustersOf.set(d, []);
    if (!clustersOf.get(d)!.includes(n.cluster)) clustersOf.get(d)!.push(n.cluster);
  }
  const clusterSeat = new Map<string, { x: number; z: number }>();
  for (const [d, cs] of clustersOf) {
    cs.sort();
    const c = anchor.get(d)!;
    cs.forEach((cl, i) => {
      const a = (2 * Math.PI * i) / cs.length + domainOrder(d);
      const r = cs.length > 1 ? cfg.clusterRadius : 0;
      clusterSeat.set(cl, { x: c.x + r * Math.cos(a), z: c.z + r * Math.sin(a) });
    });
  }
  // A term's horizontal home: its own cluster's galaxy, like any other term (A86).
  const home = nodes.map((n) => anchor.get(homeDomain(n))!);
  const meanDepth = nodes.reduce((s, n) => s + n.depth, 0) / Math.max(1, nodes.length);
  // Depth is a bias with a spread, so a row of equal-depth terms is a band, not a floor.
  const targetY = nodes.map(
    (n) => (n.depth - meanDepth + (rand() - 0.5) * cfg.depthJitter) * cfg.depthSpacing,
  );
  const P = nodes.map((n, i) => {
    const seat = clusterSeat.get(n.cluster)!;
    return {
      x: seat.x + (rand() - 0.5) * 80,
      y: targetY[i] + (rand() - 0.5) * 60,
      z: seat.z + (rand() - 0.5) * 80,
    };
  });
  const V = nodes.map(() => ({ x: 0, y: 0, z: 0 }));
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const springs = links
    .map((l) => [index.get(l.source), index.get(l.target)] as const)
    .filter((p): p is readonly [number, number] => p[0] !== undefined && p[1] !== undefined)
    .map(([a, b]) => {
      const same = nodes[a].cluster === nodes[b].cluster;
      return {
        a,
        b,
        len: same ? cfg.linkInCluster : cfg.linkAcross,
        k: same ? cfg.springIn : cfg.springAcross,
      };
    });
  const n = nodes.length;
  const cut2 = cfg.chargeCutoff * cfg.chargeCutoff;
  for (let step = 0; step < cfg.ticks; step++) {
    const alpha = 1 - step / cfg.ticks;
    // Repulsion (cut off beyond chargeCutoff, so galaxies don't push each other apart).
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const dx = P[j].x - P[i].x;
        const dy = P[j].y - P[i].y;
        const dz = P[j].z - P[i].z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > cut2) continue;
        const d2s = Math.max(d2, 25);
        const f = (cfg.charge * alpha) / d2s / Math.sqrt(d2s);
        V[i].x -= dx * f;
        V[i].y -= dy * f;
        V[i].z -= dz * f;
        V[j].x += dx * f;
        V[j].y += dy * f;
        V[j].z += dz * f;
      }
    for (const s of springs) {
      const a = P[s.a];
      const b = P[s.b];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const f = ((d - s.len) * s.k * alpha) / d;
      V[s.a].x += dx * f;
      V[s.a].y += dy * f;
      V[s.a].z += dz * f;
      V[s.b].x -= dx * f;
      V[s.b].y -= dy * f;
      V[s.b].z -= dz * f;
    }
    const centroid = new Map<string, Point3 & { n: number }>();
    for (let i = 0; i < n; i++) {
      const c = centroid.get(nodes[i].cluster) ?? { x: 0, y: 0, z: 0, n: 0 };
      c.x += P[i].x;
      c.y += P[i].y;
      c.z += P[i].z;
      c.n++;
      centroid.set(nodes[i].cluster, c);
    }
    for (let i = 0; i < n; i++) {
      const c = centroid.get(nodes[i].cluster)!;
      const k = cfg.clusterPull * alpha;
      V[i].x += (c.x / c.n - P[i].x) * k;
      V[i].z += (c.z / c.n - P[i].z) * k;
      V[i].y += (c.y / c.n - P[i].y) * k * 0.5;
      V[i].x += (home[i].x - P[i].x) * cfg.domainPull * alpha;
      V[i].z += (home[i].z - P[i].z) * cfg.domainPull * alpha;
      V[i].y += (targetY[i] - P[i].y) * cfg.depthStrength;
    }
    for (let i = 0; i < n; i++) {
      V[i].x *= 0.6;
      V[i].y *= 0.6;
      V[i].z *= 0.6;
      P[i].x += V[i].x;
      P[i].y += V[i].y;
      P[i].z += V[i].z;
    }
  }
  return new Map(nodes.map((nd, i) => [nd.id, P[i]]));
}
