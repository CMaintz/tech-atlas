import type { EdgeType } from '../../schema';
import type { Family } from '../graph-model';
import { EXPLORER } from '../explorer-config';
import { domainColour, homeDomain, type Paintable } from './palette';
import type { MapTheme } from './theme';

export const FAMILY_COLOURS: Record<Family, string> = {
  structure: '#94a3b8',
  dependency: '#fbbf24',
  contrast: '#f9a8d4',
  security: '#fb923c',
  regulation: '#c4b5fd',
  lineage: '#a8a29e',
  association: '#7dd3fc',
};

const FAMILY_COLOURS_LIGHT: Record<Family, string> = {
  structure: '#64748b',
  dependency: '#b45309',
  contrast: '#be185d',
  security: '#c2410c',
  regulation: '#6d28d9',
  lineage: '#78716c',
  association: '#0369a1',
};

export const familyColours = (theme: MapTheme = 'dark') =>
  theme === 'light' ? FAMILY_COLOURS_LIGHT : FAMILY_COLOURS;

const SYMMETRIC_TYPES: ReadonlySet<EdgeType> = new Set<EdgeType>([
  'contrasts-with',
  'alternative-to',
  'used-with',
]);

export const isDirected = (type: EdgeType) => !SYMMETRIC_TYPES.has(type);

const isCrossDomain = (a: string[], b: string[]) => !a.some((d) => b.includes(d));

export type EdgePaint = {
  colour: string;
  directed: boolean;
  crossDomain: boolean;
  gradient: [string, string, string] | null;
};

type EdgeEnds = { source: Paintable; target: Paintable };

export function edgePaint(
  link: { type: EdgeType; family: Family },
  { source, target }: EdgeEnds,
  theme: MapTheme = 'dark',
): EdgePaint {
  const colour = familyColours(theme)[link.family];
  const crossDomain = isCrossDomain(source.domain, target.domain);
  return {
    colour,
    directed: isDirected(link.type),
    crossDomain,
    gradient: crossDomain
      ? [domainColour(homeDomain(source), theme), colour, domainColour(homeDomain(target), theme)]
      : null,
  };
}

export const pairKey = (a: string, b: string) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

const CURVE_BASE = 16;
const CURVE_STEP = 18;

export function curveOffsets(links: { source: string; target: string }[]): number[] {
  const seen = new Map<string, number>();
  return links.map(({ source, target }) => {
    const key = pairKey(source, target);
    const j = seen.get(key) ?? 0;
    seen.set(key, j + 1);
    const side = j % 2 === 0 ? 1 : -1;
    const canonical = side * (CURVE_BASE + CURVE_STEP * Math.floor(j / 2));
    return source < target ? canonical : -canonical;
  });
}

export const FLOW_DASH: [number, number] = [...EXPLORER.flow.dash];
const FLOW_SPEED: number = EXPLORER.flow.speed;

export const flowOffset = (ms: number) =>
  -(((ms / 1000) * FLOW_SPEED) % (FLOW_DASH[0] + FLOW_DASH[1]));
