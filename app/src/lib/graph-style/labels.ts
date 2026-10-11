import type { Point } from './point';

export type Box = { x1: number; y1: number; x2: number; y2: number };
const overlaps = (a: Box, b: Box, pad: number) =>
  a.x1 - pad < b.x2 && b.x1 - pad < a.x2 && a.y1 - pad < b.y2 && b.y1 - pad < a.y2;

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

const LINE_HEIGHT = 1.25;
const OUTLINE_ALLOWANCE = 4;
export const LABEL_MARGIN = 4;

export function labelBelow(at: Point, nodeSize: number, width: number, font: number): Box {
  const top = at.y + nodeSize / 2 + LABEL_MARGIN;
  return {
    x1: at.x - width / 2 - OUTLINE_ALLOWANCE,
    x2: at.x + width / 2 + OUTLINE_ALLOWANCE,
    y1: top - OUTLINE_ALLOWANCE,
    y2: top + font * LINE_HEIGHT + OUTLINE_ALLOWANCE,
  };
}

export function labelAbove(at: Point, width: number, font: number): Box {
  return {
    x1: at.x - width / 2 - OUTLINE_ALLOWANCE,
    x2: at.x + width / 2 + OUTLINE_ALLOWANCE,
    y1: at.y - font * LINE_HEIGHT - OUTLINE_ALLOWANCE,
    y2: at.y + OUTLINE_ALLOWANCE,
  };
}

export function outerSide(region: Box, mapCentre: Point): 'top' | 'bottom' | 'left' | 'right' {
  const dx = (region.x1 + region.x2) / 2 - mapCentre.x;
  const dy = (region.y1 + region.y2) / 2 - mapCentre.y;
  if (Math.abs(dy) >= Math.abs(dx) * 0.6) return dy < 0 ? 'top' : 'bottom';
  return dx < 0 ? 'left' : 'right';
}
