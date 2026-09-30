/** What the lane layouts ("By depth", "By time") return, and their lane order. */
import type { Point } from '../graph-style';
import { domainRank } from '../graph-style/palette';

export type LaneLayout = {
  positions: Record<string, Point>;
  /** Where each lane's name goes (top centre of the lane). */
  lanes: { domain: string; x: number; y: number }[];
  /** Row labels: depth rows, or year ticks along the bottom. */
  ticks: { label: string; x: number; y: number }[];
  /** Terms the layout leaves out (undated terms in the time layout). */
  hidden: string[];
};

/** Lanes run in domain order (listed domains first), then by name. */
export const byDomain = (a: string, b: string) =>
  domainRank(a) - domainRank(b) || a.localeCompare(b);
