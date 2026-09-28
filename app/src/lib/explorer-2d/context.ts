/**
 * What the 2D map's parts share: the fixed pieces (the Cytoscape instance, the graph and
 * the element collections) and the small mutable state the parts read and write.
 */
import type cytoscape from 'cytoscape';
import type { Graph, GraphNode } from '../graph-model';
import type { MapTheme, Point } from '../graph-style';
import type { Map2DOptions, View } from './types';

export type MapParts = {
  cy: cytoscape.Core;
  opts: Map2DOptions;
  graph: Graph;
  byId: Map<string, GraphNode>;
  clusterOf: (id: string) => string | undefined;
  /** Term nodes (anchors and tags excluded). */
  terms: cytoscape.NodeCollection;
  /** Relationship edges (bundles excluded). */
  links: cytoscape.EdgeCollection;
  bundleEdges: cytoscape.EdgeCollection;
};

export type MapState = {
  theme: MapTheme;
  view: View | null;
  hovered: cytoscape.NodeSingular | null;
  /** Elements currently displayed — hover fades only these. */
  shown: cytoscape.Collection;
  /** True while nodes glide to a new layout: the flow dots wait for them to land. */
  moving: boolean;
  /** Island centres of the current layout (force only), for bundled routes. */
  centreNow: Record<string, Point> | undefined;
};

/** The graph link behind a relationship edge (`e<index>`). */
export const linkOf = (p: Pick<MapParts, 'graph'>, e: cytoscape.EdgeSingular) =>
  p.graph.links[Number(e.id().slice(1))];

/** Refresh `shown` from the classes (after edges or terms change). */
export const reshow = (p: MapParts, s: MapState) =>
  void (s.shown = p.cy.elements().not('.gone, .off, .anchor'));
