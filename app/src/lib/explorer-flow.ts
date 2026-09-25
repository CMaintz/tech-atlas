/**
 * The Explorer's flow (A86): small dots drift source → target along every visible
 * one-way edge of the 2D map, all the time. They are drawn on a canvas laid over the
 * map, so Cytoscape never restyles or redraws for the animation — the only per-frame
 * work is one clear and a few batched fills of on-screen dots. Edge geometry is sampled
 * once and re-sampled only when edges, classes or positions change. Symmetric
 * relationships never move; nothing moves under prefers-reduced-motion. Browser-only.
 */
import type cytoscape from 'cytoscape';
import { EXPLORER } from './explorer-config';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
/** Samples per quadratic piece of an edge's curve. */
const STEPS = 8;

/** The dots' settings (`EXPLORER.dots`), as plain numbers. */
export type DotsConfig = { readonly [K in keyof typeof EXPLORER.dots]: number };

type Path = {
  /** Sampled points (x0, y0, x1, y1, …) and cumulative lengths, in model coordinates. */
  pts: number[];
  cum: number[];
  box: { x1: number; y1: number; x2: number; y2: number };
  lit: boolean;
};

/** Cytoscape's curve through its control points: quadratic pieces joined at midpoints. */
function sample(s: cytoscape.Position, cps: cytoscape.Position[], t: cytoscape.Position): number[] {
  if (!cps.length) return [s.x, s.y, t.x, t.y];
  const out: number[] = [s.x, s.y];
  let from = s;
  cps.forEach((c, i) => {
    const next = cps[i + 1];
    const to = next ? { x: (c.x + next.x) / 2, y: (c.y + next.y) / 2 } : t;
    for (let k = 1; k <= STEPS; k++) {
      const u = k / STEPS;
      const v = 1 - u;
      out.push(
        v * v * from.x + 2 * v * u * c.x + u * u * to.x,
        v * v * from.y + 2 * v * u * c.y + u * u * to.y,
      );
    }
    from = to;
  });
  return out;
}

/**
 * Start the flow over `cy`'s `edges` (the one-way ones are chosen here). `paused` is
 * checked every frame (e.g. while nodes glide to a new layout). Returns a stop function
 * and a `resize` to call when the container changes size.
 */
export function startDots(
  cy: cytoscape.Core,
  edges: cytoscape.EdgeCollection,
  paused: () => boolean,
  /** The settings, read every frame (the hidden visual lab tunes a copy live, A95). */
  cfg: DotsConfig = EXPLORER.dots,
): { stop: () => void; resize: () => void } {
  const container = cy.container()!;
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  const directed = edges.filter((e) => e.data('directed') === 1);
  const motion = window.matchMedia?.(REDUCED_MOTION);

  let dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(container.clientWidth * dpr);
    canvas.height = Math.round(container.clientHeight * dpr);
    canvas.style.width = `${container.clientWidth}px`;
    canvas.style.height = `${container.clientHeight}px`;
  };
  resize();

  /** Paths grouped by colour, so a frame is one fill per colour. */
  let groups = new Map<string, Path[]>();
  let dirty = true;
  const rebuild = () => {
    dirty = false;
    groups = new Map();
    directed.forEach((e) => {
      if (e.hasClass('off') || e.hasClass('dim') || e.hasClass('faded')) return;
      if (e.source().hasClass('gone') || e.target().hasClass('gone')) return;
      const lit = e.hasClass('focus') || e.hasClass('lit');
      const s = e.sourceEndpoint();
      const t = e.targetEndpoint();
      if (!s || !t || !Number.isFinite(s.x) || !Number.isFinite(t.x)) return;
      const pts = sample(s, e.controlPoints() ?? [], t);
      const cum = [0];
      let x1 = pts[0];
      let y1 = pts[1];
      let x2 = x1;
      let y2 = y1;
      for (let i = 2; i < pts.length; i += 2) {
        cum.push(cum[cum.length - 1] + Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]));
        x1 = Math.min(x1, pts[i]);
        y1 = Math.min(y1, pts[i + 1]);
        x2 = Math.max(x2, pts[i]);
        y2 = Math.max(y2, pts[i + 1]);
      }
      const colour = (lit || e.hasClass('all') ? e.data('colour') : e.data('tint')) as string;
      const key = `${colour}|${lit ? 1 : 0}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({ pts, cum, box: { x1, y1, x2, y2 }, lit });
    });
  };
  const markDirty = () => void (dirty = true);
  cy.on('class style position add remove', markDirty);
  // Pan and zoom: the dots follow the live viewport (cy.pan()/cy.zoom()) in the very
  // next animation frame, outside the fps throttle, so they stay locked to the map and
  // never blink out mid-gesture (A86).
  let moved = false;
  const onViewport = () => void (moved = true);
  cy.on('viewport', onViewport);

  let raf = 0;
  let last = 0;
  let stopped = false;
  let drawn = false;
  const clear = () => {
    if (!drawn) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawn = false;
  };
  const draw = (t: number) => {
    clear();
    if (paused() || !container.offsetParent) return;
    if (dirty) rebuild();
    const zoom = cy.zoom();
    const pan = cy.pan();
    const ext = cy.extent();
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * pan.x, dpr * pan.y);
    const r = cfg.radius / zoom;
    const shift = ((t / 1000) * cfg.speed) % cfg.spacing;
    for (const [key, paths] of groups) {
      const lit = key.endsWith('|1');
      ctx.globalAlpha = lit ? cfg.litAlpha : cfg.alpha;
      ctx.fillStyle = key.slice(0, key.lastIndexOf('|'));
      ctx.beginPath();
      for (const p of paths) {
        const b = p.box;
        if (b.x2 < ext.x1 || b.x1 > ext.x2 || b.y2 < ext.y1 || b.y1 > ext.y2) continue;
        const len = p.cum[p.cum.length - 1];
        if (len < 1) continue;
        // Short edges carry one dot; longer ones one per `spacing`.
        const gap = len < cfg.spacing ? len : len / Math.floor(len / cfg.spacing);
        let seg = 1;
        for (let d = shift % gap; d < len; d += gap) {
          while (seg < p.cum.length - 1 && p.cum[seg] < d) seg++;
          const a = p.cum[seg - 1];
          const k = (d - a) / (p.cum[seg] - a || 1);
          const x = p.pts[seg * 2 - 2] + (p.pts[seg * 2] - p.pts[seg * 2 - 2]) * k;
          const y = p.pts[seg * 2 - 1] + (p.pts[seg * 2 + 1] - p.pts[seg * 2 - 1]) * k;
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
      }
      ctx.fill();
      drawn = true;
    }
    ctx.globalAlpha = 1;
  };
  const tick = (t: number) => {
    raf = 0;
    if (stopped) return;
    if (motion?.matches) {
      clear();
      return;
    }
    raf = requestAnimationFrame(tick);
    if (!moved && t - last < 1000 / cfg.fps) return;
    moved = false;
    last = t;
    draw(t);
  };
  const wake = () => {
    if (!raf && !stopped) raf = requestAnimationFrame(tick);
  };
  motion?.addEventListener?.('change', wake);
  wake();
  return {
    resize,
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      cy.removeListener('class style position add remove', markDirty);
      cy.removeListener('viewport', onViewport);
      motion?.removeEventListener?.('change', wake);
      canvas.remove();
    },
  };
}
