/**
 * Label placement for the canvas lab: which terms get a label, in priority order,
 * and where each fits (below its disc, else above) without overlapping those placed.
 */
import { LAB } from './config';

/** The engine arrays label choice reads. */
type LabelState = { n: number; visible: Uint8Array; rank: Float32Array };

/**
 * Terms that want a label, best first: the selection, the hover, the lit neighbours,
 * then by rank. Without a selection, only hubs (rank ≥ hubShare) and the hover.
 */
export function labelCandidates(
  e: LabelState,
  lit: Uint8Array,
  sel: number,
  hover: number,
): number[] {
  const cands: number[] = [];
  for (let i = 0; i < e.n; i++) {
    if (!e.visible[i]) continue;
    if (i === sel || i === hover || (sel >= 0 ? lit[i] : e.rank[i] >= LAB.hubShare)) cands.push(i);
  }
  const pri = (i: number) => (i === sel ? 3 : i === hover ? 2 : lit[i] ? 1 : 0);
  return cands.sort((a, b) => pri(b) - pri(a) || e.rank[b] - e.rank[a]);
}

/** The label boxes placed so far this frame, inside a `w` × `h` view (2 px margin). */
export class LabelSlots {
  private placed: number[] = [];
  constructor(
    private w: number,
    private h: number,
  ) {}

  /**
   * Where a `tw` px wide, `size` px tall label for a disc at (x, y), radius r goes: its
   * top below the disc, else above; undefined if neither is free (a big label, the
   * selection or hover, is placed above regardless).
   */
  place(x: number, y: number, r: number, tw: number, size: number, big: boolean) {
    let top = y + r + 4;
    if (!this.fits(x, top, tw, size)) {
      top = y - r - 4 - size;
      if (!this.fits(x, top, tw, size) && !big) return undefined;
    }
    this.placed.push(x - tw / 2 - 3, top - 2, x + tw / 2 + 3, top + size + 3);
    return top;
  }

  private fits(x: number, top: number, tw: number, size: number) {
    return this.free(x - tw / 2 - 3, top - 2, x + tw / 2 + 3, top + size + 3);
  }

  private free(x1: number, y1: number, x2: number, y2: number) {
    const p = this.placed;
    if (x1 < 2 || y1 < 2 || x2 > this.w - 2 || y2 > this.h - 2) return false;
    for (let k = 0; k < p.length; k += 4)
      if (x1 < p[k + 2] && p[k] < x2 && y1 < p[k + 3] && p[k + 1] < y2) return false;
    return true;
  }
}
