import type { ComponentType } from 'preact';
import type { ChartItem } from '../../lib/timeline-layout';
import type { PanelConfig } from '../TermPanel';

export type TimelineEntry = ChartItem & {
  summary: string;
  href: string;
};

type Dict = Record<string, string>;
export type TimelinePanel = PanelConfig & {
  lang: 'en' | 'da';
  termBase: string;
  clusterLabels: Dict;
  familyLabels: Dict;
  graphUi: Dict;
};
export interface TimelineProps {
  items: TimelineEntry[];
  domains: string[];
  domainLabels: Record<string, string>;
  domainColours: Record<string, string>;
  domainColoursLight: Record<string, string>;
  range: [number, number];
  eraLabels: Record<string, string>;
  text: Record<string, string>;
  panel?: TimelinePanel;
}

export type PanelView = ComponentType<Record<string, unknown>>;
