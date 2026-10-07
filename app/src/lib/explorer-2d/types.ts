/** The 2D map's public option and view types (re-exported by `explorer-2d.ts`). */
import type { GraphNode, Graph } from '../graph-model';
import type { MapTheme } from '../graph-style';
import type { RelationNames } from '../explorer-focus';

export type Layout = 'force' | 'depth' | 'time';

export type Map2DOptions = {
  container: HTMLElement;
  graph: Graph;
  lang: 'en' | 'da';
  clusterLabels: Record<string, string>;
  domainLabels: Record<string, string>;
  /** Pixels kept clear on the right when fitting (the open legend). */
  reserveRight: () => number;
  /** Pixels on the right covered while a term is selected (the docked term panel). */
  centreReserve: () => number;
  onSelect: (id: string | null) => void;
  onOpen: (id: string) => void;
  /** A term is hovered (e.g. to prefetch its panel data). */
  onHover?: (id: string) => void;
  /**
   * The pointer is over a term (its centre in container pixels), or left it / the view
   * moved (null) — for the Explorer's resting hover card.
   */
  onPoint?: (hit: { id: string; x: number; y: number } | null) => void;
  /** The map's palette; change it later with `retheme`. */
  theme?: MapTheme;
  /** Relationship names, written on the lit links; none without. */
  relationNames?: RelationNames;
  /**
   * 'v2' (the next Explorer's lab): term names only when lit, and cluster names that
   * light their cluster's central terms on hover and frame the cluster on a click.
   */
  variant?: 'v2';
};

/** What the map shows; every field is applied in place. */
export type View = {
  layout: Layout;
  /** Terms shown (domain filter, neighbourhood, time layout's dated terms). */
  nodes: ReadonlySet<string>;
  domains: ReadonlySet<string>;
  families: ReadonlySet<string>;
  showAll: boolean;
  selected: string | null;
  highlight: ReadonlySet<string>;
  /** The shown terms are the selection's neighbourhood (some hops out), all of it lit. */
  hoodLit?: boolean;
  colour: (n: GraphNode) => string;
  /** Domain colours of a shared term, its own first (the second is its ring); else empty. */
  bands: (n: GraphNode) => string[];
};
