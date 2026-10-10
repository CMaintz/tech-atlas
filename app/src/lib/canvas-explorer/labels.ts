import { LAB } from './config';

type LabelState = { n: number; visible: Uint8Array; rank: Float32Array };

export type LabelFocus = { lit: Uint8Array; sel: number; hover: number };

export type LabelBox = { x: number; y: number; r: number; tw: number; size: number; big: boolean };

export function labelCandidates(e: LabelState, { lit, sel, hover }: LabelFocus): number[] {
  const cands: number[] = [];
  for (let i = 0; i < e.n; i++) {
    if (!e.visible[i]) continue;
    if (i === sel || i === hover || (sel >= 0 ? lit[i] : e.rank[i] >= LAB.hubShare)) cands.push(i);
  }
  const pri = (i: number) => (i === sel ? 3 : i === hover ? 2 : lit[i] ? 1 : 0);
  return cands.sort((a, b) => pri(b) - pri(a) || e.rank[b] - e.rank[a]);
}

export class LabelSlots {
  private placed: number[] = [];
  constructor(
    private w: number,
    private h: number,
  ) {}

  place(l: LabelBox) {
    let top = l.y + l.r + 4;
    if (!this.fits(l, top)) {
      top = l.y - l.r - 4 - l.size;
      if (!this.fits(l, top) && !l.big) return undefined;
    }
    this.placed.push(l.x - l.tw / 2 - 3, top - 2, l.x + l.tw / 2 + 3, top + l.size + 3);
    return top;
  }

  private fits(l: LabelBox, top: number) {
    const x1 = l.x - l.tw / 2 - 3;
    const y1 = top - 2;
    const x2 = l.x + l.tw / 2 + 3;
    const y2 = top + l.size + 3;
    const p = this.placed;
    if (x1 < 2 || y1 < 2 || x2 > this.w - 2 || y2 > this.h - 2) return false;
    for (let k = 0; k < p.length; k += 4)
      if (x1 < p[k + 2] && p[k] < x2 && y1 < p[k + 3] && p[k + 1] < y2) return false;
    return true;
  }
}
