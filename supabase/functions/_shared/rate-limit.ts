/**
 * The in-isolate flood filter: a fixed-window counter per key. Old windows are
 * dropped as keys are seen. Each function keeps one per isolate; the real limits live
 * in Postgres, shared by every isolate.
 */
export class RateLimiter {
  private windows = new Map<string, { start: number; count: number }>();
  constructor(
    private limit: number,
    private windowMs: number,
  ) {}

  allow(key: string, now: number): boolean {
    if (this.windows.size > 10_000) this.dropExpired(now);
    const w = this.windows.get(key);
    if (!w || now - w.start >= this.windowMs) {
      this.windows.set(key, { start: now, count: 1 });
      return true;
    }
    w.count += 1;
    return w.count <= this.limit;
  }

  private dropExpired(now: number) {
    for (const [k, w] of this.windows) {
      if (now - w.start >= this.windowMs) this.windows.delete(k);
    }
  }
}
