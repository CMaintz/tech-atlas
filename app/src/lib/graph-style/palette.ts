import { contrastRatio, hslToHex, hueDistance, wrapHue } from './colour';
import { CREAM, type MapTheme } from './theme';

const DOMAIN_HUES: Record<string, number> = {
  security: 355, // pink → red-orange
  cs: 212, // cyan → indigo
  ai: 285, // violet → magenta
  platform: 150, // green → teal
};

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

export const domainRank = (d: string) => rankIn(Object.keys(DOMAIN_HUES), d);

export const rankIn = (list: string[], x: string) =>
  list.includes(x) ? list.indexOf(x) : list.length;

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

type Hsl = { h: number; s: number; l: number };

function darkenOnCreamUntilContrast({ h, s, l }: Hsl, min: number): string {
  let hex = hslToHex(h, s, l);
  while (contrastRatio(hex, CREAM) < min && l > 12) hex = hslToHex(h, s, (l -= 2));
  return hex;
}

const DOMAIN_MIN_CONTRAST = 4.5;
const CLUSTER_MIN_CONTRAST = 3;

export const domainColour = (domain: string, theme: MapTheme = 'dark') =>
  theme === 'light'
    ? darkenOnCreamUntilContrast({ h: domainHue(domain), s: 78, l: 34 }, DOMAIN_MIN_CONTRAST)
    : hslToHex(domainHue(domain), 82, 62);

export const CLUSTER_HUE_SPREAD = 22;
const CLUSTER_LIGHTNESS: Record<MapTheme, number[]> = {
  dark: [62, 74, 54],
  light: [40, 50, 32],
};
const CLUSTER_SATURATION: Record<MapTheme, number[]> = {
  dark: [80, 70, 86],
  light: [74, 66, 80],
};

export const clustersOf = (domain: string) =>
  Object.entries(CLUSTER_DOMAIN)
    .filter(([, d]) => d === domain)
    .map(([c]) => c);

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
  return theme === 'light'
    ? darkenOnCreamUntilContrast({ h: hue, s, l }, CLUSTER_MIN_CONTRAST)
    : hslToHex(hue, s, l);
}

export const CLUSTER_COLOURS: Record<string, string> = Object.fromEntries(
  Object.keys(CLUSTER_DOMAIN).map((c) => [c, clusterColour(c)]),
);

export type Paintable = { domain: string[]; cluster: string };

export const homeDomain = (n: Paintable) => CLUSTER_DOMAIN[n.cluster] ?? n.domain[0] ?? '';

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
