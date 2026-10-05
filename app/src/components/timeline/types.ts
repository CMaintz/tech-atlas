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
  /** Lane order (every domain with a dated term). */
  domains: string[];
  domainLabels: Record<string, string>;
  domainColours: Record<string, string>;
  /** The same domains' colours on the cream map. */
  domainColoursLight: Record<string, string>;
  /** Axis range in years, [start, end). */
  range: [number, number];
  eraLabels: Record<string, string>;
  text: Record<string, string>;
  /** The Explorer's term panel, loaded on first click; absent → popover only. */
  panel?: TimelinePanel;
}

/** TermPanel's props, loosely: it is imported on demand, so only its type is known here. */
export type PanelView = ComponentType<Record<string, unknown>>;
