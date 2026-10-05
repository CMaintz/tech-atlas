/**
 * The domain filter: which terms and edges are visible with some domains off, and
 * the colours a term takes when its own domain is one of them.
 */
import {
  clusterColour,
  domainColour,
  homeDomain,
  type MapTheme,
  type Paintable,
} from '../graph-style';
import type { Link } from './types';

/**
 * A term is visible when at least one of its domains is enabled. A term shared by
 * two domains is one node: it stays while either is on. Nothing is ever shown merely
 * because it is connected to a visible term, and edges need both ends visible.
 */
export const termVisible = (n: { domain: string[] }, enabled: ReadonlySet<string>) =>
  n.domain.some((d) => enabled.has(d));

/** An edge may be drawn only when both its ends are visible terms — in every mode. */
export const linkVisible = (l: Link, visible: ReadonlySet<string>) =>
  visible.has(l.source) && visible.has(l.target);

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
  theme: MapTheme = 'dark',
): { fill: string; ring: string | null } {
  const home = homeDomain(n);
  const eff = effectiveHome(n, enabled);
  const other = n.domain.find((d) => d !== eff && (!enabled || enabled.has(d)));
  return {
    fill: eff === home ? clusterColour(n.cluster, home, theme) : domainColour(eff, theme),
    ring: other ? domainColour(other, theme) : null,
  };
}

/**
 * The domain colours of a term in several enabled domains: its effective home
 * first, then the others. The map fills the term in its own shade and rings it in the
 * second colour. A term in one enabled domain gets none.
 */
export function domainBands(
  n: Paintable,
  enabled?: ReadonlySet<string>,
  theme: MapTheme = 'dark',
): string[] {
  const on = n.domain.filter((d) => !enabled || enabled.has(d));
  if (on.length < 2) return [];
  const home = effectiveHome(n, enabled);
  return [home, ...on.filter((d) => d !== home)].map((d) => domainColour(d, theme));
}
