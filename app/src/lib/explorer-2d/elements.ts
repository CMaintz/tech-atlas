/**
 * The 2D map's elements: a node per term (sized by PageRank), an edge per relationship
 * (backbone and cross-island classes), an anchor per island centre and a bundle per
 * pair of linked islands. Pure element definitions.
 */
import type cytoscape from 'cytoscape';
import type { Graph, GraphNode } from '../graph-model';
import { EXPLORER } from '../explorer-config';
import { clusterColour, homeDomain, isDirected, type MapTheme, type Point } from '../graph-style';
import { backbone, clusterBundles, pageRank, sizeForRank } from '../graph-layout';
import { edgeData } from '../graph-cytoscape';

/** Each term's PageRank over the whole graph (one-way relationships directed). */
export const rankOf = (graph: Graph) =>
  pageRank(
    graph.nodes.map((n) => n.id),
    graph.links.map((l) => ({ ...l, directed: isDirected(l.type) })),
  );

/** A term node: size and fonts from its rank; its colour comes with the first view. */
export function termElement(n: GraphNode, r: number, lang: 'en' | 'da') {
  return {
    data: {
      id: n.id,
      label: n.term[lang],
      colour: '#888888',
      size: sizeForRank(r),
      font: 8 + Math.round(Math.sqrt(r) * 7),
      farFont: r >= EXPLORER.node.hubShare ? Math.round(14 + Math.sqrt(r) * 12) : 0,
      hoverFont: 15,
    },
  };
}

/** Relationship edges, tinted by their source's cluster; `bb` backbone, `xc` cross-island. */
export function linkElements(graph: Graph, byId: Map<string, GraphNode>, theme: MapTheme) {
  const spine = backbone(graph.nodes, graph.links);
  return edgeData(
    graph.links,
    (id) => byId.get(id),
    (_, i) => 0.7 + graph.links[i].weight * 0.35,
    EXPLORER.edges.restAlpha,
    theme,
  ).map((data, i) => {
    const s = byId.get(data.source)!;
    const t = byId.get(data.target)!;
    const cross = s.cluster !== t.cluster;
    return {
      data: { ...data, tint: clusterColour(s.cluster, homeDomain(s), theme) },
      classes: [spine.has(i) ? 'bb' : '', cross ? 'xc' : ''].join(' '),
    };
  });
}

/** An invisible node at each island's centre, for the bundles to join. */
export const anchorElements = (clusterIds: string[], centre: Record<string, Point>) =>
  clusterIds.map((c) => ({
    group: 'nodes' as const,
    data: { id: `anc:${c}` },
    position: centre[c],
    classes: 'anchor',
  }));

/** A bundle's width for `count` relationships, the busiest bundle having `top`. */
export const bundleWidth = (count: number, top: number) => {
  const [wMin, wMax] = EXPLORER.edges.bundleWidth;
  return wMin + (wMax - wMin) * Math.sqrt(count / top);
};

/** A bundle's gradient from one island's shade to the other's. */
export const bundleGradient = (a: string, b: string, theme: MapTheme) =>
  `${clusterColour(a, undefined, theme)} ${clusterColour(b, undefined, theme)}`;

/** One bundle edge between each pair of linked islands. */
export function bundleElements(graph: Graph, byId: Map<string, GraphNode>, theme: MapTheme) {
  const bundles = clusterBundles(graph.links, (id) => byId.get(id)?.cluster, 1);
  const top = Math.max(1, ...bundles.map((b) => b.count));
  return bundles.map((b, i) => ({
    group: 'edges' as const,
    data: {
      id: `bundle:${i}`,
      source: `anc:${b.a}`,
      target: `anc:${b.b}`,
      a: b.a,
      b: b.b,
      count: b.count,
      width: bundleWidth(b.count, top),
      curve: (i % 2 ? 1 : -1) * 24,
      alpha: 0,
      colour: clusterColour(b.a, undefined, theme),
      arrow: 'none',
      gradient: bundleGradient(b.a, b.b, theme),
    },
    classes: 'bundle',
  }));
}

/** The map's first elements: terms and relationships (anchors and bundles follow). */
export function mapElements(graph: Graph, lang: 'en' | 'da', theme: MapTheme) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const rank = rankOf(graph);
  const nodes = graph.nodes.map((n) => termElement(n, rank.get(n.id) ?? 0, lang));
  return [...nodes, ...linkElements(graph, byId, theme)] as cytoscape.ElementDefinition[];
}
