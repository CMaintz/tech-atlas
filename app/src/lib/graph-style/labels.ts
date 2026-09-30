/** Label placement on the 2D map: label boxes, overlap culling and region-name sides. */
import type { Point } from './point';

export type Box = { x1: number; y1: number; x2: number; y2: number };
const overlaps = (a: Box, b: Box, pad: number) =>
  a.x1 - pad < b.x2 && b.x1 - pad < a.x2 && a.y1 - pad < b.y2 && b.y1 - pad < a.y2;

/**
 * Which labels to hide so none overlap: walk the labels in priority order (most
 * important first) and keep each one that clears every label already kept and every
 * fixed `blocker` (e.g. cluster names). Returns the ids to hide.
 */
export function cullLabels(
  labels: (Box & { id: string })[],
  blockers: Box[] = [],
  pad = 2,
): Set<string> {
  const kept: Box[] = [...blockers];
  const hidden = new Set<string>();
  for (const l of labels) {
    if (kept.some((k) => overlaps(l, k, pad))) hidden.add(l.id);
    else kept.push(l);
  }
  return hidden;
}

/** Line height and outline allowance used when estimating a label's box. */
const LINE = 1.25;
const OUTLINE = 4;
/** Gap between a node and its label (Cytoscape `text-margin-y`). */
export const LABEL_MARGIN = 4;

/** Box of a label drawn centred below a node (`text-valign: bottom`). */
export function labelBelow(at: Point, nodeSize: number, width: number, font: number): Box {
  const top = at.y + nodeSize / 2 + LABEL_MARGIN;
  return {
    x1: at.x - width / 2 - OUTLINE,
    x2: at.x + width / 2 + OUTLINE,
    y1: top - OUTLINE,
    y2: top + font * LINE + OUTLINE,
  };
}

/** Box of a label drawn centred above a point (`text-valign: top`, zero-size node). */
export function labelAbove(at: Point, width: number, font: number): Box {
  return {
    x1: at.x - width / 2 - OUTLINE,
    x2: at.x + width / 2 + OUTLINE,
    y1: at.y - font * LINE - OUTLINE,
    y2: at.y + OUTLINE,
  };
}

/**
 * The side of a region its name goes on: the side facing away from the map's centre,
 * so the name sits in open space rather than over another region.
 */
export function outerSide(region: Box, mapCentre: Point): 'top' | 'bottom' | 'left' | 'right' {
  const dx = (region.x1 + region.x2) / 2 - mapCentre.x;
  const dy = (region.y1 + region.y2) / 2 - mapCentre.y;
  if (Math.abs(dy) >= Math.abs(dx) * 0.6) return dy < 0 ? 'top' : 'bottom';
  return dx < 0 ? 'left' : 'right';
}
