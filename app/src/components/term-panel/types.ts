import type { ComponentChildren, RefObject } from 'preact';
import type { Graph, GraphNode } from '../../lib/graph-model';
import type { MapTheme } from '../../lib/graph-style';
import type { TermRecord } from '../../lib/term-panel';
import type { TermCache } from './term-cache';
import type { PanelNav } from './use-panel-nav';

export type Lang = 'en' | 'da';
export type Dict = Record<string, string>;

/** Everything the panel needs that the page renders once (explorer/index.astro). */
export type PanelConfig = {
  /** `/…/api/terms/` — per-term records live at `<apiBase><id>.json`. */
  apiBase: string;
  graphUrl: string;
  /** Page UI strings (site.ts UI[lang]). */
  ui: Dict;
  /** Panel strings (site.ts PANEL_UI[lang]). */
  text: Dict;
  /** Relationship labels, including generated inverses (terms.ts EDGE_LABELS). */
  edgeLabels: Dict;
  /** Edge type → the type seen from the other end (schema.ts EDGE_TYPES). */
  edgeInverse: Dict;
  /** Reading order of relationship groups (terms.ts RELATION_ORDER). */
  relationOrder: string[];
};

export interface PanelProps extends PanelConfig {
  lang: Lang;
  id: string;
  graph: Graph;
  termBase: string;
  clusterLabels: Dict;
  domainLabels: Dict;
  familyLabels: Dict;
  graphUi: Dict;
  /** Re-focus the map (and this panel) on another term. */
  onSelect: (id: string) => void;
  onClose: () => void;
  /** Map actions for this term (Explorer: prerequisites, neighbourhood, whole map). */
  actions?: ComponentChildren;
  /** Name of the actions group, for assistive technology. */
  actionsLabel?: string;
}

/** The elements the panel moves focus between. */
export type PanelRefs = {
  root: RefObject<HTMLDivElement>;
  heading: RefObject<HTMLHeadingElement>;
  expandBtn: RefObject<HTMLButtonElement>;
};

/** The panel's window state: docked or expanded (a modal dialog), and its focus targets. */
export type PanelChrome = {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  refs: PanelRefs;
};

/** One open panel: its props, the term on screen, and the state its parts share. */
export type Panel = PanelChrome & {
  props: PanelProps;
  node: GraphNode;
  theme: MapTheme;
  cache: TermCache;
  /** The record, once it has arrived for this term (never a previous term's). */
  record: TermRecord | undefined;
  /** This term's record failed to load. */
  failed: boolean;
  nav: PanelNav;
  /** A term's name in the panel's language (the id when it is not on the map). */
  nameOf: (id: string) => string;
};

/** What a panel part receives. */
export type PartProps = { panel: Panel };
