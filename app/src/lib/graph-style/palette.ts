/**
 * Domain colour families and cluster shades: each domain owns a hue, its clusters
 * are shades within it, and the cream map deepens them until they hold contrast.
 */
import { contrastRatio, hslToHex, hueDistance, wrapHue } from './colour';
import { CREAM, type MapTheme } from './theme';

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

/**
 * A domain's place in every domain ordering (legend, lanes, regions, galaxies): the
 * listed domains in DOMAIN_HUES order, then any other domain after them.
 */
export const domainRank = (d: string) => rankIn(Object.keys(DOMAIN_HUES), d);

/** Position of `x` in `list`, or just past the end when it is not listed. */
export const rankIn = (list: string[], x: string) =>
  list.includes(x) ? list.indexOf(x) : list.length;

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

/**
 * An HSL colour for the cream map, darkened step by step until it has at least `min`
 * contrast on it: greens and cyans are far brighter than reds or violets at the same
 * lightness, so one lightness for every hue would leave them washed out.
 */
function onCream(h: number, s: number, l: number, min: number): string {
  let hex = hslToHex(h, s, l);
  while (contrastRatio(hex, CREAM) < min && l > 12) hex = hslToHex(h, s, (l -= 2));
  return hex;
}

/**
 * Minimum contrast on cream: domain colours are also text (lane and legend names), so
 * AA for text; cluster shades colour nodes and edges, so 3:1 (WCAG 1.4.11).
 */
const DOMAIN_MIN = 4.5;
const CLUSTER_MIN = 3;

/** A domain's signature colour (its base hue; mid lightness, or deep on the cream map). */
export const domainColour = (domain: string, theme: MapTheme = 'dark') =>
  theme === 'light'
    ? onCream(domainHue(domain), 78, 34, DOMAIN_MIN)
    : hslToHex(domainHue(domain), 82, 62);

/** How far (±degrees) cluster shades may drift from their domain's hue. */
export const CLUSTER_HUE_SPREAD = 22;
const CLUSTER_LIGHTNESS: Record<MapTheme, number[]> = {
  dark: [62, 74, 54],
  light: [40, 50, 32],
};
const CLUSTER_SATURATION: Record<MapTheme, number[]> = {
  dark: [80, 70, 86],
  light: [74, 66, 80],
};

/** Clusters of one domain, in the order CLUSTER_DOMAIN lists them. */
export const clustersOf = (domain: string) =>
  Object.entries(CLUSTER_DOMAIN)
    .filter(([, d]) => d === domain)
    .map(([c]) => c);

/**
 * A cluster's colour: a shade of its domain's hue. Clusters spread evenly across
 * ±CLUSTER_HUE_SPREAD and cycle through three lightness steps, so neighbours in the
 * list differ in both hue and value.
 */
export function clusterColour(
  cluster: string,
  fallbackDomain?: string,
  theme: MapTheme = 'dark',
): string {
  const domain = CLUSTER_DOMAIN[cluster] ?? fallbackDomain;
  if (!domain) return theme === 'light' ? '#78716c' : '#a3a3a3';
  const siblings = clustersOf(domain);
  const i = siblings.indexOf(cluster);
  if (i < 0) return domainColour(domain, theme);
  const t = siblings.length > 1 ? i / (siblings.length - 1) - 0.5 : 0;
  const hue = domainHue(domain) + t * 2 * CLUSTER_HUE_SPREAD;
  const s = CLUSTER_SATURATION[theme][i % 3];
  const l = CLUSTER_LIGHTNESS[theme][i % 3];
  return theme === 'light' ? onCream(hue, s, l, CLUSTER_MIN) : hslToHex(hue, s, l);
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
export function nodePaint(
  n: Paintable,
  theme: MapTheme = 'dark',
): { fill: string; ring: string | null } {
  const home = homeDomain(n);
  const other = n.domain.find((d) => d !== home);
  return {
    fill: clusterColour(n.cluster, home, theme),
    ring: other ? domainColour(other, theme) : null,
  };
}
