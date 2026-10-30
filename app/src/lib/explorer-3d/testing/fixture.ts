/** A small two-domain graph and views of it for the 3D map's tests. */
import { FAMILY, type Graph, type GraphLink, type GraphNode } from '../../graph-model';
import { domainColour, homeDomain } from '../../graph-style';
import type { View3D } from '../../explorer-3d';

/** Named, so two string fields cannot silently trade places; the rest are defaults. */
type NodeRow = Pick<GraphNode, 'id' | 'cluster' | 'depth' | 'domain'>;
type LinkRow = Pick<GraphLink, 'source' | 'type' | 'target' | 'weight'>;

const node = ({ id, cluster, depth, domain }: NodeRow): GraphNode => ({
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

const link = ({ source, type, target, weight }: LinkRow): GraphLink => ({
  source,
  target,
  type,
  family: FAMILY[type],
  weight,
});

export const graph: Graph = {
  nodes: [
    node({ id: 'security/cia', cluster: 'fundamentals', depth: 0, domain: ['security'] }),
    node({ id: 'security/threat', cluster: 'fundamentals', depth: 1, domain: ['security'] }),
    node({ id: 'security/firewall', cluster: 'controls', depth: 2, domain: ['security', 'cs'] }),
    node({ id: 'security/mfa', cluster: 'controls', depth: 1, domain: ['security'] }),
    node({ id: 'cs/tcp', cluster: 'networking', depth: 0, domain: ['cs'] }),
    node({ id: 'cs/ip', cluster: 'networking', depth: 0, domain: ['cs'] }),
    node({ id: 'cs/kernel', cluster: 'os', depth: 1, domain: ['cs'] }),
    node({ id: 'cs/process', cluster: 'os', depth: 2, domain: ['cs'] }),
  ],
  links: [
    link({ source: 'security/firewall', type: 'requires', target: 'cs/tcp', weight: 3 }),
    link({ source: 'security/mfa', type: 'mitigates', target: 'security/threat', weight: 2.5 }),
    link({ source: 'cs/tcp', type: 'requires', target: 'cs/ip', weight: 2 }),
    link({ source: 'cs/process', type: 'part-of', target: 'cs/kernel', weight: 1.5 }),
    link({ source: 'security/cia', type: 'used-with', target: 'security/threat', weight: 1 }),
    link({
      source: 'security/firewall',
      type: 'mitigates',
      target: 'security/threat',
      weight: 2.2,
    }),
    link({ source: 'cs/process', type: 'requires', target: 'cs/ip', weight: 0.8 }),
    link({ source: 'security/firewall', type: 'implements', target: 'security/cia', weight: 1.2 }),
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
