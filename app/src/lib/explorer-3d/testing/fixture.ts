/** A small two-domain graph and views of it for the 3D map's tests. */
import type { EdgeType } from '../../../schema';
import { FAMILY, type Graph, type GraphLink, type GraphNode } from '../../graph-model';
import { domainColour, homeDomain } from '../../graph-style';
import type { View3D } from '../../explorer-3d';

const node = (id: string, cluster: string, depth: number, domain: string[]): GraphNode => ({
  id,
  term: { en: id.split('/')[1].toUpperCase(), da: id.split('/')[1] },
  domain,
  cluster,
  depth,
  degree: 1,
  requires: [],
  collides: false,
  mentions: [],
});

const link = (source: string, type: EdgeType, target: string, weight: number): GraphLink => ({
  source,
  target,
  type,
  family: FAMILY[type],
  weight,
});

export const graph: Graph = {
  nodes: [
    node('security/cia', 'fundamentals', 0, ['security']),
    node('security/threat', 'fundamentals', 1, ['security']),
    node('security/firewall', 'controls', 2, ['security', 'cs']),
    node('security/mfa', 'controls', 1, ['security']),
    node('cs/tcp', 'networking', 0, ['cs']),
    node('cs/ip', 'networking', 0, ['cs']),
    node('cs/kernel', 'os', 1, ['cs']),
    node('cs/process', 'os', 2, ['cs']),
  ],
  links: [
    link('security/firewall', 'requires', 'cs/tcp', 3),
    link('security/mfa', 'mitigates', 'security/threat', 2.5),
    link('cs/tcp', 'requires', 'cs/ip', 2),
    link('cs/process', 'part-of', 'cs/kernel', 1.5),
    link('security/cia', 'used-with', 'security/threat', 1),
    link('security/firewall', 'mitigates', 'security/threat', 2.2),
    link('cs/process', 'requires', 'cs/ip', 0.8),
    link('security/firewall', 'implements', 'security/cia', 1.2),
  ],
};

export const relationNames = {
  label: { requires: 'Requires', 'required-by': 'Required by', mitigates: 'Mitigates' },
  inverse: { requires: 'required-by', mitigates: 'mitigated-by' },
};

export const domainLabels = { security: 'Security', cs: 'Computer science' };

const all = new Set(graph.nodes.map((n) => n.id));
const families = new Set(graph.links.map((l) => l.family));
const colour = (n: GraphNode) => domainColour(homeDomain(n));
const bands = (n: GraphNode) => n.domain.map((d) => domainColour(d));

/** The overview: every term, every family, nothing selected. */
export const overview: View3D = {
  nodes: all,
  families,
  showAll: false,
  selected: null,
  highlight: new Set(),
  colour,
  bands,
};

export const withView = (patch: Partial<View3D>): View3D => ({ ...overview, ...patch });
