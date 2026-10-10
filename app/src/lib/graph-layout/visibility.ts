import {
  clusterColour,
  domainColour,
  homeDomain,
  type MapTheme,
  type Paintable,
} from '../graph-style';
import type { Link } from './types';

export const termVisible = (n: { domain: string[] }, enabled: ReadonlySet<string>) =>
  n.domain.some((d) => enabled.has(d));

export const linkVisible = (l: Link, visible: ReadonlySet<string>) =>
  visible.has(l.source) && visible.has(l.target);

export function effectiveHome(n: Paintable, enabled?: ReadonlySet<string>): string {
  const home = homeDomain(n);
  if (!enabled || enabled.has(home)) return home;
  return n.domain.find((d) => enabled.has(d)) ?? home;
}

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
