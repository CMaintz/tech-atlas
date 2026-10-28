import type { ComponentChildren, RefObject } from 'preact';
import type { Graph, GraphNode } from '../../lib/graph-model';
import type { MapTheme } from '../../lib/graph-style';
import type { TermRecord } from '../../lib/term-panel';
import type { TermCache } from './term-cache';
import type { PanelNav } from './use-panel-nav';

export type Lang = 'en' | 'da';
export type Dict = Record<string, string>;

export type PanelConfig = {
  apiBase: string;
  graphUrl: string;
  ui: Dict;
  text: Dict;
  edgeLabels: Dict;
  edgeInverse: Dict;
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
  onSelect: (id: string) => void;
  onClose: () => void;
  actions?: ComponentChildren;
  actionsLabel?: string;
}

export type PanelRefs = {
  root: RefObject<HTMLDivElement | null>;
  heading: RefObject<HTMLHeadingElement | null>;
  expandBtn: RefObject<HTMLButtonElement | null>;
};

export type PanelChrome = {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  refs: PanelRefs;
};

export type Panel = PanelChrome & {
  props: PanelProps;
  node: GraphNode;
  theme: MapTheme;
  cache: TermCache;
  record: TermRecord | undefined;
  failed: boolean;
  nav: PanelNav;
  nameOf: (id: string) => string;
};

export type PartProps = { panel: Panel };
