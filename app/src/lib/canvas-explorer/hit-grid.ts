export type Discs = { xs: Float32Array; ys: Float32Array; rs: Float32Array; order: Int32Array };

export class HitGrid {
  private cells = new Map<number, number[]>();
  constructor(
    private discs: Discs,
    private cell = 40,
  ) {}
  private key = (cx: number, cy: number) => cx * 65536 + cy;
  build(live: (i: number) => boolean) {
    this.cells.clear();
    for (let i = 0; i < this.discs.xs.length; i++) if (live(i)) this.addToCells(i);
  }
  private addToCells(i: number) {
    const x = this.discs.xs[i];
    const y = this.discs.ys[i];
    const r = this.discs.rs[i];
    const x0 = Math.floor((x - r) / this.cell);
    const x1 = Math.floor((x + r) / this.cell);
    const y0 = Math.floor((y - r) / this.cell);
    const y1 = Math.floor((y + r) / this.cell);
    for (let cx = x0; cx <= x1; cx++)
      for (let cy = y0; cy <= y1; cy++) {
        const k = this.key(cx, cy);
        const list = this.cells.get(k);
        if (list) list.push(i);
        else this.cells.set(k, [i]);
      }
  }
  nearest(x: number, y: number, slop = 4): number {
    const { xs, ys, rs, order } = this.discs;
    const list = this.cells.get(this.key(Math.floor(x / this.cell), Math.floor(y / this.cell)));
    let best = -1;
    for (const i of list ?? []) {
      const reach = Math.max(rs[i], 7) + slop;
      if (Math.hypot(xs[i] - x, ys[i] - y) > reach) continue;
      if (best < 0 || order[i] > order[best]) best = i;
    }
    return best;
  }
}
