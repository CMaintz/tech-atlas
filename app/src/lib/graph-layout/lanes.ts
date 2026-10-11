import type { Point } from '../graph-style';
import { domainRank } from '../graph-style/palette';

export type LaneLayout = {
  positions: Record<string, Point>;
  lanes: { domain: string; x: number; y: number }[];
  ticks: { label: string; x: number; y: number }[];
  hidden: string[];
};

export const byDomain = (a: string, b: string) =>
  domainRank(a) - domainRank(b) || a.localeCompare(b);
