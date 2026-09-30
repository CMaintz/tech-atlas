/**
 * Disc packing: lay out circles round the origin so linked ones sit near each other and
 * no two come closer than a gap. The island layout packs clusters, then domains, with it.
 */
import type { Point } from './point';

export type Disc = { id: string; r: number };
/** How strongly two discs are related (e.g. the number of edges between them). */
export type DiscLink = { a: string; b: string; w: number };

const STEPS = 300;
const SETTLE_STEPS = 200;

/** Start positions: one disc at the origin, or every disc on a ring in the given order. */
function ringStart(discs: Disc[], gap: number): Map<string, Point> {
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

/**
 * Push two disc centres apart, half the shortfall each, until they are `need` apart;
 * coincident centres split along the fixed direction `angle`.
 */
function pushDiscsApart(pa: Point, pb: Point, need: number, angle: number): void {
  let dx = pb.x - pa.x;
  let dy = pb.y - pa.y;
  let d = Math.hypot(dx, dy);
  if (d < 1e-6) {
    dx = Math.cos(angle);
    dy = Math.sin(angle);
    d = 1;
  }
  if (d >= need) return;
  const push = (need - d) / 2 / d;
  pa.x -= dx * push;
  pa.y -= dy * push;
  pb.x += dx * push;
  pb.y += dy * push;
}

/**
 * One separation sweep over every pair of discs, each pair pushed to its radii plus
 * `gap` apart. Unlike the layout's point `separate` it moves exactly the shortfall and
 * always runs a fixed number of sweeps.
 */
export function separateDiscs(discs: Disc[], pos: Map<string, Point>, gap: number): void {
  for (let i = 0; i < discs.length; i++)
    for (let j = i + 1; j < discs.length; j++) {
      const need = discs[i].r + discs[j].r + gap;
      pushDiscsApart(pos.get(discs[i].id)!, pos.get(discs[j].id)!, need, i + j);
    }
}

/** Pull two disc centres together by `pull` of the slack beyond `rest`, half each. */
function pullTogether(pa: Point, pb: Point, rest: number, pull: number): void {
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

/** Pull each linked pair together (weakly, by weight) while there is slack between them. */
function attractLinked(
  links: DiscLink[],
  byId: Map<string, Disc>,
  pos: Map<string, Point>,
  gap: number,
  alpha: number,
): void {
  for (const l of links) {
    const rest = byId.get(l.a)!.r + byId.get(l.b)!.r + gap;
    pullTogether(pos.get(l.a)!, pos.get(l.b)!, rest, Math.min(0.02 * l.w, 0.2) * alpha);
  }
}

/** Draw every disc towards the origin. */
function gather(pos: Map<string, Point>, alpha: number): void {
  for (const p of pos.values()) {
    p.x -= p.x * 0.05 * alpha;
    p.y -= p.y * 0.05 * alpha;
  }
}

/**
 * Pack discs round the origin with at least `gap` between any two: start on a ring
 * (in the given order), then a few hundred cheap steps pull linked discs together
 * (weakly, by weight), draw everything towards the centre, and push overlapping pairs
 * apart; a final separation-only pass makes every gap hold. Deterministic.
 */
export function packDiscs(discs: Disc[], links: DiscLink[], gap: number): Map<string, Point> {
  const pos = ringStart(discs, gap);
  const byId = new Map(discs.map((d) => [d.id, d]));
  const live = links.filter((l) => byId.has(l.a) && byId.has(l.b) && l.a !== l.b);
  for (let step = 0; step < STEPS; step++) {
    const alpha = 1 - step / STEPS;
    attractLinked(live, byId, pos, gap, alpha);
    gather(pos, alpha);
    separateDiscs(discs, pos, gap);
  }
  for (let step = 0; step < SETTLE_STEPS; step++) separateDiscs(discs, pos, gap);
  return pos;
}
