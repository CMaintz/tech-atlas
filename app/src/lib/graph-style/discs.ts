import { getOrThrow } from '../map-get';
import type { Point } from './point';

export type Disc = { id: string; r: number };
export type DiscLink = { a: string; b: string; w: number };

const STEPS = 300;
const SETTLE_STEPS = 200;

function ringStartPositions(discs: Disc[], gap: number): Map<string, Point> {
  const pos = new Map<string, Point>();
  if (discs.length === 1) pos.set(discs[0].id, { x: 0, y: 0 });
  else {
    const ring = discs.reduce((s, d) => s + 2 * d.r + gap, 0) / (2 * Math.PI);
    discs.forEach((d, k) => {
      const a = (2 * Math.PI * k) / discs.length - Math.PI / 2;
      pos.set(d.id, { x: ring * Math.cos(a), y: ring * Math.sin(a) });
    });
  }
  return pos;
}

type Separation = { need: number; splitAngle: number };

function pushDiscsApart(pa: Point, pb: Point, { need, splitAngle }: Separation): void {
  let dx = pb.x - pa.x;
  let dy = pb.y - pa.y;
  let d = Math.hypot(dx, dy);
  if (d < 1e-6) {
    dx = Math.cos(splitAngle);
    dy = Math.sin(splitAngle);
    d = 1;
  }
  if (d >= need) return;
  const push = (need - d) / 2 / d;
  pa.x -= dx * push;
  pa.y -= dy * push;
  pb.x += dx * push;
  pb.y += dy * push;
}

export function separateDiscs(discs: Disc[], pos: Map<string, Point>, gap: number): void {
  for (let i = 0; i < discs.length; i++)
    for (let j = i + 1; j < discs.length; j++) {
      const need = discs[i].r + discs[j].r + gap;
      const pa = getOrThrow(pos, discs[i].id, 'disc position');
      const pb = getOrThrow(pos, discs[j].id, 'disc position');
      pushDiscsApart(pa, pb, { need, splitAngle: i + j });
    }
}

type Spring = { rest: number; pull: number };

function pullTogether(pa: Point, pb: Point, { rest, pull }: Spring): void {
  const dx = pb.x - pa.x;
  const dy = pb.y - pa.y;
  const d = Math.hypot(dx, dy) || 1;
  const slack = d - rest;
  if (slack <= 0) return;
  const k = (pull * slack) / d / 2;
  pa.x += dx * k;
  pa.y += dy * k;
  pb.x -= dx * k;
  pb.y -= dy * k;
}

type Packing = { byId: Map<string, Disc>; pos: Map<string, Point>; gap: number };

function attractLinked(links: DiscLink[], { byId, pos, gap }: Packing, alpha: number): void {
  for (const l of links) {
    const rest = getOrThrow(byId, l.a, 'disc').r + getOrThrow(byId, l.b, 'disc').r + gap;
    const pull = Math.min(0.02 * l.w, 0.2) * alpha;
    pullTogether(getOrThrow(pos, l.a, 'disc position'), getOrThrow(pos, l.b, 'disc position'), {
      rest,
      pull,
    });
  }
}

function drawTowardsOrigin(pos: Map<string, Point>, alpha: number): void {
  for (const p of pos.values()) {
    p.x -= p.x * 0.05 * alpha;
    p.y -= p.y * 0.05 * alpha;
  }
}

export function packDiscs(discs: Disc[], links: DiscLink[], gap: number): Map<string, Point> {
  const pos = ringStartPositions(discs, gap);
  const byId = new Map(discs.map((d) => [d.id, d]));
  const live = links.filter((l) => byId.has(l.a) && byId.has(l.b) && l.a !== l.b);
  for (let step = 0; step < STEPS; step++) {
    const alpha = 1 - step / STEPS;
    attractLinked(live, { byId, pos, gap }, alpha);
    drawTowardsOrigin(pos, alpha);
    separateDiscs(discs, pos, gap);
  }
  for (let step = 0; step < SETTLE_STEPS; step++) separateDiscs(discs, pos, gap);
  return pos;
}
