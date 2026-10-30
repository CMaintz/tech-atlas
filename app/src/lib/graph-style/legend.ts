import {
  clusterColour,
  clustersOf,
  domainColour,
  domainRank,
  homeDomain,
  rankIn,
  type Paintable,
} from './palette';
import type { MapTheme } from './theme';

export type LegendDomain = {
  domain: string;
  colour: string;
  clusters: { cluster: string; colour: string }[];
};

const byRank = (rank: (x: string) => number) => (a: string, b: string) =>
  rank(a) - rank(b) || a.localeCompare(b);

function presentClusters(nodes: Paintable[]): Map<string, Set<string>> {
  const clusters = new Map<string, Set<string>>();
  for (const n of nodes) {
    const home = homeDomain(n);
    const homed = clusters.get(home) ?? new Set<string>();
    clusters.set(home, homed.add(n.cluster));
    for (const d of n.domain) if (!clusters.has(d)) clusters.set(d, new Set());
  }
  return clusters;
}

function legendEntry(domain: string, clusters: Set<string>, theme: MapTheme): LegendDomain {
  const order = clustersOf(domain);
  return {
    domain,
    colour: domainColour(domain, theme),
    clusters: [...clusters]
      .sort(byRank((c) => rankIn(order, c)))
      .map((cluster) => ({ cluster, colour: clusterColour(cluster, domain, theme) })),
  };
}

export function legendDomains(nodes: Paintable[], theme: MapTheme = 'dark'): LegendDomain[] {
  const clusters = presentClusters(nodes);
  const byDomainRank = byRank(domainRank);
  return [...clusters]
    .sort(([a], [b]) => byDomainRank(a, b))
    .map(([domain, homed]) => legendEntry(domain, homed, theme));
}
