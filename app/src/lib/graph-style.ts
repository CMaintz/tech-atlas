/**
 * The graph's visual language, in one place (A61): domain colour families, cluster
 * shades, relationship-family edge colours, which edges are directed, edge curvature,
 * layout distances and the 3D cluster force. Pure — no DOM, no Cytoscape — so the
 * Explorer, the term-page neighbourhood graph, the Timeline and the tests share it.
 */
import type { EdgeType } from '../schema';
import type { Family } from './graph-model';

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

type Seedable = Paintable & { id: string };
type Point = { x: number; y: number };
const GOLDEN_RAD = Math.PI * (3 - Math.sqrt(5));

/**
 * Starting positions for the force layout, so it settles into systems: domains on a
 * wide ring (loose regions), each domain's clusters on a ring around the domain's
 * centre, each cluster's terms on a sunflower spiral around the cluster's centre.
 * Deterministic — no randomness, stable under input order.
 */
export function clusterSeedPositions(nodes: Seedable[]): Record<string, Point> {
  const tree = new Map<string, Map<string, Seedable[]>>();
  for (const n of nodes) {
    const d = homeDomain(n);
    if (!tree.has(d)) tree.set(d, new Map());
    const clusters = tree.get(d)!;
    clusters.set(n.cluster, [...(clusters.get(n.cluster) ?? []), n]);
  }
  const listed = Object.keys(DOMAIN_HUES);
  const rank = (d: string) => (listed.includes(d) ? listed.indexOf(d) : listed.length);
  const domains = [...tree.keys()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  // Size each ring by what it holds, so big domains and clusters get room.
  const clusterRadius = (count: number) => 22 * Math.sqrt(count) + 20;
  const domainRadius = (clusters: Map<string, Seedable[]>) =>
    [...clusters.values()].reduce((s, c) => s + clusterRadius(c.length), 0) / 1.6 + 60;
  const radii = domains.map((d) => domainRadius(tree.get(d)!));
  const ring = domains.length > 1 ? Math.max(...radii) * 1.9 : 0;
  const out: Record<string, Point> = {};
  domains.forEach((d, di) => {
    const a = (2 * Math.PI * di) / domains.length - Math.PI / 2;
    const centre = { x: ring * Math.cos(a), y: ring * Math.sin(a) };
    const clusters = [...tree.get(d)!.entries()].sort(([a], [b]) => a.localeCompare(b));
    clusters.forEach(([, members], ci) => {
      const b = (2 * Math.PI * ci) / clusters.length;
      const r = clusters.length > 1 ? radii[di] : 0;
      const cc = { x: centre.x + r * Math.cos(b), y: centre.y + r * Math.sin(b) };
      [...members]
        .sort((p, q) => p.id.localeCompare(q.id))
        .forEach((n, i) => {
          const rr = 18 * Math.sqrt(i + 0.5);
          out[n.id] = {
            x: cc.x + rr * Math.cos(i * GOLDEN_RAD),
            y: cc.y + rr * Math.sin(i * GOLDEN_RAD),
          };
        });
    });
  });
  return out;
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

/** Dash pattern and speed of the animated flow along one-way edges. */
export const FLOW_DASH: [number, number] = [6, 6];
/** Pixels the dash pattern advances per second (source → target). */
export const FLOW_SPEED = 18;

/** Dash offset for a moment in time: negative, so dashes travel source → target. */
export const flowOffset = (ms: number) =>
  -(((ms / 1000) * FLOW_SPEED) % (FLOW_DASH[0] + FLOW_DASH[1]));
