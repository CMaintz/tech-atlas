/**
 * A uniform grid over screen positions for hit-testing: `nearest` returns the index of
 * the topmost disc under the point (the last drawn wins), or -1.
 */
export class HitGrid {
  private cells = new Map<number, number[]>();
  constructor(private cell = 40) {}
  private key = (cx: number, cy: number) => cx * 65536 + cy;
  build(xs: Float32Array, ys: Float32Array, rs: Float32Array, live: (i: number) => boolean) {
    this.cells.clear();
    for (let i = 0; i < xs.length; i++) if (live(i)) this.add(i, xs[i], ys[i], rs[i]);
  }
  /** File disc i under every cell its bounding box touches. */
  private add(i: number, x: number, y: number, r: number) {
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
  /** `order[i]` is i's draw position (higher = in front); `slop` widens tiny targets. */
  nearest(
    x: number,
    y: number,
    xs: Float32Array,
    ys: Float32Array,
    rs: Float32Array,
    order: Int32Array,
    slop = 4,
  ): number {
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
