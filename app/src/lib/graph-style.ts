/**
 * The graph's visual language, in one place (A74): domain colour families, cluster
 * shades, relationship-family edge colours, which edges are directed, edge curvature,
 * layout distances and the 3D cluster force. Pure — no DOM, no Cytoscape — so the
 * Explorer, the term-page neighbourhood graph, the Timeline and the tests share it.
 */
import type { EdgeType } from '../schema';
import type { Family } from './graph-model';
import { EXPLORER } from './explorer-config';

// ---- Colour maths --------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const wrapHue = (h: number) => ((h % 360) + 360) % 360;

/** HSL (h in degrees, s and l in percent) → `#rrggbb`. */
export function hslToHex(h: number, s: number, l: number): string {
  const S = clamp(s, 0, 100) / 100;
  const L = clamp(l, 0, 100) / 100;
  const k = (n: number) => (n + wrapHue(h) / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

/** Shortest distance between two hues on the colour wheel (0–180). */
export const hueDistance = (a: number, b: number) => {
  const d = Math.abs(wrapHue(a) - wrapHue(b));
  return Math.min(d, 360 - d);
};

// ---- Domains and clusters --------------------------------------------------------

/**
 * Each domain owns one hue family; its clusters are shades within it. Hues are spaced
 * round the wheel so the four families never read as each other on a dark canvas.
 */
export const DOMAIN_HUES: Record<string, number> = {
  security: 355, // pink → red-orange
  cs: 212, // cyan → indigo
  ai: 285, // violet → magenta
  platform: 150, // green → teal
};

/**
 * Which domain's hue a cluster is shaded from. Clusters are authored per domain folder
 * (like CLUSTER_LABELS in site.ts); a cluster missing here falls back to its term's
 * first domain, so a new cluster still lands in the right colour family.
 */
export const CLUSTER_DOMAIN: Record<string, string> = {
  fundamentals: 'security',
  awareness: 'security',
  controls: 'security',
  'risk-management': 'security',
  compliance: 'security',
  'incident-response': 'security',
  'application-security': 'security',
  'security-operations': 'security',
  networking: 'cs',
  os: 'cs',
  identity: 'cs',
  cryptography: 'cs',
  web: 'cs',
  'ml-fundamentals': 'ai',
  llm: 'ai',
  'ai-risk': 'ai',
  training: 'ai',
  evaluation: 'ai',
  'model-architecture': 'ai',
  prompting: 'ai',
  'ai-infrastructure': 'ai',
  retrieval: 'ai',
  agents: 'ai',
  'ai-coding': 'ai',
  cloud: 'platform',
  containers: 'platform',
  delivery: 'platform',
  observability: 'platform',
};

/** Minimum hue gap a new (unlisted) domain keeps from every other domain. */
const MIN_DOMAIN_GAP = 34;
const GOLDEN_ANGLE = 137.508;

const hashString = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/**
 * The hue for a domain: the listed one, or — for a domain added later — a stable hue
 * derived from its name, stepped round the wheel by the golden angle until it keeps
 * clear of every listed domain.
 */
export function domainHue(domain: string): number {
  if (domain in DOMAIN_HUES) return DOMAIN_HUES[domain];
  const taken = Object.values(DOMAIN_HUES);
  let hue = hashString(domain) % 360;
  for (let i = 0; i < 24; i++) {
    if (taken.every((t) => hueDistance(t, hue) >= MIN_DOMAIN_GAP)) return hue;
    hue = wrapHue(hue + GOLDEN_ANGLE);
  }
  return hue;
}

/** A domain's signature colour (its base hue, mid lightness). */
export const domainColour = (domain: string) => hslToHex(domainHue(domain), 82, 62);

/** How far (±degrees) cluster shades may drift from their domain's hue. */
export const CLUSTER_HUE_SPREAD = 22;
const CLUSTER_LIGHTNESS = [62, 74, 54];
const CLUSTER_SATURATION = [80, 70, 86];

/** Clusters of one domain, in the order CLUSTER_DOMAIN lists them. */
const clustersOf = (domain: string) =>
  Object.entries(CLUSTER_DOMAIN)
    .filter(([, d]) => d === domain)
    .map(([c]) => c);

/**
 * A cluster's colour: a shade of its domain's hue. Clusters spread evenly across
 * ±CLUSTER_HUE_SPREAD and cycle through three lightness steps, so neighbours in the
 * list differ in both hue and value.
 */
export function clusterColour(cluster: string, fallbackDomain?: string): string {
  const domain = CLUSTER_DOMAIN[cluster] ?? fallbackDomain;
  if (!domain) return '#a3a3a3';
  const siblings = clustersOf(domain);
  const i = siblings.indexOf(cluster);
  if (i < 0) return domainColour(domain);
  const t = siblings.length > 1 ? i / (siblings.length - 1) - 0.5 : 0;
  const hue = domainHue(domain) + t * 2 * CLUSTER_HUE_SPREAD;
  return hslToHex(hue, CLUSTER_SATURATION[i % 3], CLUSTER_LIGHTNESS[i % 3]);
}

/** Every listed cluster's colour — used by server-rendered pages (Timeline). */
export const CLUSTER_COLOURS: Record<string, string> = Object.fromEntries(
  Object.keys(CLUSTER_DOMAIN).map((c) => [c, clusterColour(c)]),
);

export type Paintable = { domain: string[]; cluster: string };

/** The domain a node's cluster belongs to — its "home" colour family. */
export const homeDomain = (n: Paintable) => CLUSTER_DOMAIN[n.cluster] ?? n.domain[0] ?? '';

/**
 * A node's fill (cluster shade) and, for a term in more than one domain, a ring in the
 * other domain's colour — so a node that bridges two domains shows both.
 */
export function nodePaint(n: Paintable): { fill: string; ring: string | null } {
  const home = homeDomain(n);
  const other = n.domain.find((d) => d !== home);
  return {
    fill: clusterColour(n.cluster, home),
    ring: other ? domainColour(other) : null,
  };
}

/** Domains present in a node list, in a stable order (listed domains first). */
export function legendDomains(nodes: Paintable[]): {
  domain: string;
  colour: string;
  clusters: { cluster: string; colour: string }[];
}[] {
  const clusters = new Map<string, Set<string>>();
  for (const n of nodes) {
    const home = homeDomain(n);
    if (!clusters.has(home)) clusters.set(home, new Set());
    clusters.get(home)!.add(n.cluster);
    for (const d of n.domain) if (!clusters.has(d)) clusters.set(d, new Set());
  }
  const listed = Object.keys(DOMAIN_HUES);
  const rank = (d: string) => (listed.includes(d) ? listed.indexOf(d) : listed.length);
  return [...clusters.keys()]
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((domain) => {
      const order = clustersOf(domain);
      const rankC = (c: string) => (order.includes(c) ? order.indexOf(c) : order.length);
      return {
        domain,
        colour: domainColour(domain),
        clusters: [...clusters.get(domain)!]
          .sort((a, b) => rankC(a) - rankC(b) || a.localeCompare(b))
          .map((cluster) => ({ cluster, colour: clusterColour(cluster, domain) })),
      };
    });
}

// ---- Edges ------------------------------------------------------------------------

/** Edge colour by relationship family (SPEC §7, A29). */
export const FAMILY_COLOURS: Record<Family, string> = {
  structure: '#94a3b8',
  dependency: '#fbbf24',
  contrast: '#f9a8d4',
  security: '#fb923c',
  regulation: '#c4b5fd',
  lineage: '#a8a29e',
  association: '#7dd3fc',
};

/**
 * Relationships that read the same both ways (schema.ts `symmetric: true`): drawn
 * without an arrow and never animated. Every other type is one-way.
 */
export const SYMMETRIC_TYPES: ReadonlySet<EdgeType> = new Set<EdgeType>([
  'contrasts-with',
  'alternative-to',
  'used-with',
]);

export const isDirected = (type: EdgeType) => !SYMMETRIC_TYPES.has(type);

/** True when two endpoints share no domain — the edge bridges domains. */
export const isCrossDomain = (a: string[], b: string[]) => !a.some((d) => b.includes(d));

export type EdgePaint = {
  colour: string;
  directed: boolean;
  crossDomain: boolean;
  /** Stops for a cross-domain gradient: source domain → family → target domain. */
  gradient: [string, string, string] | null;
};

export function edgePaint(
  link: { type: EdgeType; family: Family },
  source: Paintable,
  target: Paintable,
): EdgePaint {
  const colour = FAMILY_COLOURS[link.family];
  const crossDomain = isCrossDomain(source.domain, target.domain);
  return {
    colour,
    directed: isDirected(link.type),
    crossDomain,
    gradient: crossDomain
      ? [domainColour(homeDomain(source)), colour, domainColour(homeDomain(target))]
      : null,
  };
}

/** Base bend of a lone edge, and the extra bend for each further edge on the pair. */
export const CURVE_BASE = 16;
export const CURVE_STEP = 18;

/**
 * Control-point distance for every edge (Cytoscape `unbundled-bezier`). Edges sharing
 * a pair of endpoints fan out on alternating sides, whichever way each one points, so
 * none of them overlap. Distances are relative to each edge's own direction, hence
 * the sign flip for edges running against the pair's canonical order.
 */
export function curveOffsets(links: { source: string; target: string }[]): number[] {
  const seen = new Map<string, number>();
  return links.map(({ source, target }) => {
    const key = source < target ? `${source}\u0000${target}` : `${target}\u0000${source}`;
    const j = seen.get(key) ?? 0;
    seen.set(key, j + 1);
    const side = j % 2 === 0 ? 1 : -1;
    const canonical = side * (CURVE_BASE + CURVE_STEP * Math.floor(j / 2));
    return source < target ? canonical : -canonical;
  });
}

// ---- Layout -----------------------------------------------------------------------

/**
 * Ideal edge length for the force layout: short inside a cluster, longer across
 * clusters, longest across domains — so clusters pull into tight systems and domains
 * settle into loose regions.
 */
export function idealEdgeLength(a: Paintable, b: Paintable): number {
  if (a.cluster === b.cluster) return 70;
  if (homeDomain(a) === homeDomain(b)) return 210;
  return 300;
}

export type Point = { x: number; y: number };

/** An island: one cluster's terms, already laid out, seen from outside as a circle. */
export type Island = { id: string; domain: string; r: number };
/** How strongly two islands are related (e.g. the number of edges between them). */
export type IslandLink = { a: string; b: string; w: number };

/** Clear space between two islands of one domain, and between two domains' islands. */
export const ISLAND_GAP = 45;
export const DOMAIN_GAP = 150;

const domainRank = (d: string) => {
  const listed = Object.keys(DOMAIN_HUES);
  return listed.includes(d) ? listed.indexOf(d) : listed.length;
};

type Disc = { id: string; r: number };
type Circle = Point & { r: number };

/**
 * Pack discs round the origin with at least `gap` between any two: start on a ring
 * (in the given order), then a few hundred cheap steps pull linked discs together
 * (weakly, by weight), draw everything towards the centre, and push overlapping pairs
 * apart; a final separation-only pass makes every gap hold. Deterministic.
 */
function packDiscs(discs: Disc[], links: IslandLink[], gap: number): Map<string, Point> {
  const pos = new Map<string, Point>();
  if (discs.length === 1) pos.set(discs[0].id, { x: 0, y: 0 });
  else {
    const ring = discs.reduce((s, d) => s + 2 * d.r + gap, 0) / (2 * Math.PI);
    discs.forEach((d, k) => {
      const a = (2 * Math.PI * k) / discs.length - Math.PI / 2;
      pos.set(d.id, { x: ring * Math.cos(a), y: ring * Math.sin(a) });
    });
  }
  const byId = new Map(discs.map((d) => [d.id, d]));
  const live = links.filter((l) => byId.has(l.a) && byId.has(l.b) && l.a !== l.b);
  const separate = () => {
    for (let i = 0; i < discs.length; i++)
      for (let j = i + 1; j < discs.length; j++) {
        const pa = pos.get(discs[i].id)!;
        const pb = pos.get(discs[j].id)!;
        let dx = pb.x - pa.x;
        let dy = pb.y - pa.y;
        let d = Math.hypot(dx, dy);
        if (d < 1e-6) {
          // Coincident: split along a fixed, index-derived direction.
          dx = Math.cos(i + j);
          dy = Math.sin(i + j);
          d = 1;
        }
        const need = discs[i].r + discs[j].r + gap;
        if (d >= need) continue;
        const push = (need - d) / 2 / d;
        pa.x -= dx * push;
        pa.y -= dy * push;
        pb.x += dx * push;
        pb.y += dy * push;
      }
  };
  const STEPS = 300;
  for (let step = 0; step < STEPS; step++) {
    const alpha = 1 - step / STEPS;
    for (const l of live) {
      const pa = pos.get(l.a)!;
      const pb = pos.get(l.b)!;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const d = Math.hypot(dx, dy) || 1;
      const slack = d - (byId.get(l.a)!.r + byId.get(l.b)!.r + gap);
      if (slack <= 0) continue;
      const k = (Math.min(0.02 * l.w, 0.2) * alpha * slack) / d / 2;
      pa.x += dx * k;
      pa.y += dy * k;
      pb.x -= dx * k;
      pb.y -= dy * k;
    }
    for (const p of pos.values()) {
      p.x -= p.x * 0.05 * alpha;
      p.y -= p.y * 0.05 * alpha;
    }
    separate();
  }
  for (let step = 0; step < 200; step++) separate();
  return pos;
}

/** Links in one canonical order (a < b, weights of duplicates summed). */
function canonicalLinks(links: IslandLink[]): IslandLink[] {
  const merged = new Map<string, IslandLink>();
  for (const l of links) {
    const [a, b] = l.a < l.b ? [l.a, l.b] : [l.b, l.a];
    const key = JSON.stringify([a, b]);
    merged.set(key, { a, b, w: (merged.get(key)?.w ?? 0) + l.w });
  }
  return [...merged.entries()].sort(([x], [y]) => (x < y ? -1 : 1)).map(([, l]) => l);
}

/**
 * Where each cluster island goes (A74), in two levels: each domain's islands are
 * packed into a region (ISLAND_GAP apart, related islands drawn together), then the
 * regions are packed as discs (DOMAIN_GAP apart, drawn together by the links between
 * domains). Clusters read as separate islands, domains as separate, coherent regions.
 * Returns island centres and each region's circle. Deterministic; independent of
 * input order.
 */
export function packIslands(
  islands: Island[],
  links: IslandLink[] = [],
): { islands: Record<string, Point>; regions: Record<string, Circle> } {
  const list = [...islands].sort(
    (a, b) =>
      domainRank(a.domain) - domainRank(b.domain) ||
      a.domain.localeCompare(b.domain) ||
      a.id.localeCompare(b.id),
  );
  const canonical = canonicalLinks(links);
  const domainOf = new Map(list.map((i) => [i.id, i.domain]));
  const domains = [...new Set(list.map((i) => i.domain))];
  const local = new Map<string, Point>();
  const regionR = new Map<string, number>();
  for (const d of domains) {
    const mine = list.filter((i) => i.domain === d);
    const inside = canonical.filter((l) => domainOf.get(l.a) === d && domainOf.get(l.b) === d);
    const pos = packDiscs(mine, inside, ISLAND_GAP);
    // Centre the region on its own discs, and measure it.
    const cx = mine.reduce((s, i) => s + pos.get(i.id)!.x, 0) / mine.length;
    const cy = mine.reduce((s, i) => s + pos.get(i.id)!.y, 0) / mine.length;
    let r = 0;
    for (const i of mine) {
      const p = { x: pos.get(i.id)!.x - cx, y: pos.get(i.id)!.y - cy };
      local.set(i.id, p);
      r = Math.max(r, Math.hypot(p.x, p.y) + i.r);
    }
    regionR.set(d, r);
  }
  const between = canonicalLinks(
    canonical
      .filter((l) => domainOf.get(l.a) !== domainOf.get(l.b))
      .map((l) => ({ a: domainOf.get(l.a)!, b: domainOf.get(l.b)!, w: l.w / 4 })),
  );
  const centres = packDiscs(
    domains.map((d) => ({ id: d, r: regionR.get(d)! })),
    between,
    DOMAIN_GAP,
  );
  return {
    islands: Object.fromEntries(
      list.map((i) => {
        const c = centres.get(i.domain)!;
        const p = local.get(i.id)!;
        return [i.id, { x: c.x + p.x, y: c.y + p.y }];
      }),
    ),
    regions: Object.fromEntries(
      domains.map((d) => [d, { ...centres.get(d)!, r: regionR.get(d)! }]),
    ),
  };
}

export type Box = { x1: number; y1: number; x2: number; y2: number };
const overlaps = (a: Box, b: Box, pad: number) =>
  a.x1 - pad < b.x2 && b.x1 - pad < a.x2 && a.y1 - pad < b.y2 && b.y1 - pad < a.y2;

/**
 * Which labels to hide so none overlap: walk the labels in priority order (most
 * important first) and keep each one that clears every label already kept and every
 * fixed `blocker` (e.g. cluster names). Returns the ids to hide.
 */
export function cullLabels(
  labels: (Box & { id: string })[],
  blockers: Box[] = [],
  pad = 2,
): Set<string> {
  const kept: Box[] = [...blockers];
  const hidden = new Set<string>();
  for (const l of labels) {
    if (kept.some((k) => overlaps(l, k, pad))) hidden.add(l.id);
    else kept.push(l);
  }
  return hidden;
}

/** Line height and outline allowance used when estimating a label's box. */
const LINE = 1.25;
const OUTLINE = 4;
/** Gap between a node and its label (Cytoscape `text-margin-y`). */
export const LABEL_MARGIN = 4;

/** Box of a label drawn centred below a node (`text-valign: bottom`). */
export function labelBelow(at: Point, nodeSize: number, width: number, font: number): Box {
  const top = at.y + nodeSize / 2 + LABEL_MARGIN;
  return {
    x1: at.x - width / 2 - OUTLINE,
    x2: at.x + width / 2 + OUTLINE,
    y1: top - OUTLINE,
    y2: top + font * LINE + OUTLINE,
  };
}

/** Box of a label drawn centred above a point (`text-valign: top`, zero-size node). */
export function labelAbove(at: Point, width: number, font: number): Box {
  return {
    x1: at.x - width / 2 - OUTLINE,
    x2: at.x + width / 2 + OUTLINE,
    y1: at.y - font * LINE - OUTLINE,
    y2: at.y + OUTLINE,
  };
}

/**
 * The side of a region its name goes on: the side facing away from the map's centre,
 * so the name sits in open space rather than over another region.
 */
export function outerSide(region: Box, mapCentre: Point): 'top' | 'bottom' | 'left' | 'right' {
  const dx = (region.x1 + region.x2) / 2 - mapCentre.x;
  const dy = (region.y1 + region.y2) / 2 - mapCentre.y;
  if (Math.abs(dy) >= Math.abs(dx) * 0.6) return dy < 0 ? 'top' : 'bottom';
  return dx < 0 ? 'left' : 'right';
}

/** A small, fast, seedable PRNG (mulberry32). */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The fixed seed every layout uses, so the same map always settles the same way. */
export const LAYOUT_SEED = 20260925;

/**
 * Run a synchronous computation with `Math.random` replaced by a seeded PRNG. Layout
 * libraries (fcose's spectral step) draw from `Math.random`; seeding it makes the map
 * deterministic. Always restored, even if `fn` throws.
 */
export function withSeededRandom<T>(seed: number, fn: () => T): T {
  const original = Math.random;
  Math.random = seededRandom(seed);
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

// ---- 3D ---------------------------------------------------------------------------

type ForceNode = { cluster: string; x?: number; z?: number; vx?: number; vz?: number };

/**
 * A d3-style force pulling each node towards its cluster's centre in the horizontal
 * plane (x, z). Height (y) is left alone: in 3D it means Depth (ADR-0001).
 */
export function clusterForce(strength = 0.08) {
  let nodes: ForceNode[] = [];
  const force = (alpha: number) => {
    const sum = new Map<string, { x: number; z: number; n: number }>();
    for (const n of nodes) {
      const s = sum.get(n.cluster) ?? { x: 0, z: 0, n: 0 };
      s.x += n.x ?? 0;
      s.z += n.z ?? 0;
      s.n += 1;
      sum.set(n.cluster, s);
    }
    const k = strength * alpha;
    for (const n of nodes) {
      const s = sum.get(n.cluster)!;
      if (s.n < 2) continue;
      n.vx = (n.vx ?? 0) + (s.x / s.n - (n.x ?? 0)) * k;
      n.vz = (n.vz ?? 0) + (s.z / s.n - (n.z ?? 0)) * k;
    }
  };
  force.initialize = (ns: ForceNode[]) => {
    nodes = ns;
  };
  return force;
}

// ---- Flow ---------------------------------------------------------------------------

/** Dash pattern and speed of the animated flow along one-way edges (explorer-config). */
export const FLOW_DASH: [number, number] = [...EXPLORER.flow.dash];
/** Pixels the dash pattern advances per second (source → target). */
export const FLOW_SPEED: number = EXPLORER.flow.speed;

/** Dash offset for a moment in time: negative, so dashes travel source → target. */
export const flowOffset = (ms: number) =>
  -(((ms / 1000) * FLOW_SPEED) % (FLOW_DASH[0] + FLOW_DASH[1]));
