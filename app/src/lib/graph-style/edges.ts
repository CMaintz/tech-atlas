/**
 * How a relationship is drawn: its family colour, whether it has a direction, the
 * cross-domain gradient, how parallel edges fan out and the animated flow along it.
 */
import type { EdgeType } from '../../schema';
import type { Family } from '../graph-model';
import { EXPLORER } from '../explorer-config';
import { domainColour, homeDomain, type Paintable } from './palette';
import type { MapTheme } from './theme';

/** Edge colour by relationship family (SPEC §7). */
export const FAMILY_COLOURS: Record<Family, string> = {
  structure: '#94a3b8',
  dependency: '#fbbf24',
  contrast: '#f9a8d4',
  security: '#fb923c',
  regulation: '#c4b5fd',
  lineage: '#a8a29e',
  association: '#7dd3fc',
};

/** The same families on the cream map: deeper shades that hold up on a light ground. */
export const FAMILY_COLOURS_LIGHT: Record<Family, string> = {
  structure: '#64748b',
  dependency: '#b45309',
  contrast: '#be185d',
  security: '#c2410c',
  regulation: '#6d28d9',
  lineage: '#78716c',
  association: '#0369a1',
};

/** A theme's family colours. */
export const familyColours = (theme: MapTheme = 'dark') =>
  theme === 'light' ? FAMILY_COLOURS_LIGHT : FAMILY_COLOURS;

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

/** The key of an unordered pair (of terms or clusters), the same whichever way round. */
export const pairKey = (a: string, b: string) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

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
    const key = pairKey(source, target);
    const j = seen.get(key) ?? 0;
    seen.set(key, j + 1);
    const side = j % 2 === 0 ? 1 : -1;
    const canonical = side * (CURVE_BASE + CURVE_STEP * Math.floor(j / 2));
    return source < target ? canonical : -canonical;
  });
}

// ---- Flow ---------------------------------------------------------------------------

/** Dash pattern and speed of the animated flow along one-way edges (explorer-config). */
export const FLOW_DASH: [number, number] = [...EXPLORER.flow.dash];
/** Pixels the dash pattern advances per second (source → target). */
export const FLOW_SPEED: number = EXPLORER.flow.speed;

/** Dash offset for a moment in time: negative, so dashes travel source → target. */
export const flowOffset = (ms: number) =>
  -(((ms / 1000) * FLOW_SPEED) % (FLOW_DASH[0] + FLOW_DASH[1]));
