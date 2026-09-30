/** The map legend's contents: the domains present, each with its clusters' colours. */
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

/** Order by `rank`, then by name. */
const byRank = (rank: (x: string) => number) => (a: string, b: string) =>
  rank(a) - rank(b) || a.localeCompare(b);

/**
 * Every domain a node list touches, with the clusters homed in it: a term's other
 * domains are present too, even when none of their clusters is.
 */
export function presentClusters(nodes: Paintable[]): Map<string, Set<string>> {
  const clusters = new Map<string, Set<string>>();
  for (const n of nodes) {
    const home = homeDomain(n);
    if (!clusters.has(home)) clusters.set(home, new Set());
    clusters.get(home)!.add(n.cluster);
    for (const d of n.domain) if (!clusters.has(d)) clusters.set(d, new Set());
  }
  return clusters;
}

/** One legend row: a domain's colour and its clusters in CLUSTER_DOMAIN order. */
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

/** Domains present in a node list, in a stable order (listed domains first). */
export function legendDomains(nodes: Paintable[], theme: MapTheme = 'dark'): LegendDomain[] {
  const clusters = presentClusters(nodes);
  return [...clusters.keys()]
    .sort(byRank(domainRank))
    .map((domain) => legendEntry(domain, clusters.get(domain)!, theme));
}
