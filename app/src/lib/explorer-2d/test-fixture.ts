/** A small graph for the 2D map's tests: two domains, three clusters, one shared term. */
import type { EdgeType } from '../../schema';
import { FAMILY, type Graph, type GraphNode } from '../graph-model';

const term = (id: string, cluster: string, domain: string[], era?: number): GraphNode => ({
  id,
  term: { en: id.split('/')[1], da: `${id.split('/')[1]}-da` },
  domain,
  cluster,
  ...(era ? { era } : {}),
  depth: 0,
  degree: 0,
  requires: [],
  collides: false,
  mentions: [],
});

const link = (source: string, type: EdgeType, target: string, weight = 1) => ({
  source,
  target,
  type,
  family: FAMILY[type],
  weight,
});

export const FIXTURE: Graph = {
  nodes: [
    term('security/cia', 'fundamentals', ['security'], 1975),
    term('security/threat', 'fundamentals', ['security']),
    term('security/risk', 'fundamentals', ['security'], 1990),
    term('security/vulnerability', 'fundamentals', ['security']),
    term('security/phishing', 'awareness', ['security'], 1996),
    term('security/mfa', 'awareness', ['security']),
    term('cs/network', 'networking', ['cs'], 1969),
    term('cs/protocol', 'networking', ['cs']),
    term('cs/firewall', 'networking', ['cs', 'security'], 1988),
  ],
  links: [
    link('security/threat', 'exploits', 'security/vulnerability', 1.2),
    link('security/risk', 'requires', 'security/threat'),
    link('security/risk', 'requires', 'security/vulnerability'),
    link('security/cia', 'part-of', 'security/risk', 0.8),
    link('security/phishing', 'kind-of', 'security/threat'),
    link('security/mfa', 'mitigates', 'security/phishing', 1.5),
    link('cs/protocol', 'part-of', 'cs/network'),
    link('cs/firewall', 'mitigates', 'security/threat'),
    link('cs/firewall', 'requires', 'cs/network'),
    link('cs/firewall', 'used-with', 'security/mfa', 0.5),
  ],
};

export const LABELS = {
  clusterLabels: { fundamentals: 'Fundamentals', awareness: 'Awareness' },
  domainLabels: { security: 'Security', cs: 'Computer science' },
};
