/**
 * Hover (A97a): three-render-objects re-raycasts the last pointer position every frame,
 * so while the camera moves terms drift under a resting pointer. The term under the
 * pointer is tracked always, but shown only through the motion gate: never while the
 * camera moves (auto-rotate, a glide, a drag, the wheel, keys), and not again until the
 * pointer itself moves once it has stopped.
 */
import { EXPLORER } from '../explorer-config';
import type { GraphNode } from '../graph-model';
import { refocus } from './lens';
import type { Ctx } from './context';
import type { Link3 } from './types';

/** Tell the page what is under the pointer, and after a short rest light it. */
function createPointerReport(ctx: Ctx, setHover: (id: string | null) => void) {
  const { el, opts, fg, gate, model } = ctx;
  let timer = 0;
  /** The term under the pointer, as 3d-force-graph last reported it. */
  let under: string | null = null;
  const show = () => {
    const p = under ? model.byId.get(under) : undefined;
    el.style.cursor = p ? 'pointer' : 'grab';
    if (p) {
      opts.onHover?.(p.id);
      const at = fg.graph2ScreenCoords(p.x, p.y, p.z);
      opts.onPoint?.({ id: p.id, x: at.x, y: at.y });
    } else opts.onPoint?.(null);
    window.clearTimeout(timer);
    timer = window.setTimeout(() => gate.open && setHover(under), EXPLORER.hoverDelayMs);
  };
  const track = (id: string | null) => void (under = id);
  return { show, track, cancel: () => window.clearTimeout(timer) };
}

export function createHover(ctx: Ctx, refresh: () => void) {
  const { el, opts, fg, gate, state } = ctx;
  const setHover = (id: string | null) => {
    if (id === state.hoverId) return;
    state.hoverId = id;
    refocus(state, gate);
    refresh();
  };
  const report = createPointerReport(ctx, setHover);
  fg.onNodeHover((n: GraphNode | null) => {
    report.track(n ? n.id : null);
    if (gate.open) report.show();
  });
  fg.onLinkHover((l: Link3 | null) => void (state.underLink = l && gate.open ? l.i : null));
  /** The camera started moving: drop the hover and its card at once. */
  const stop = () => {
    report.cancel();
    state.underLink = null;
    opts.onPoint?.(null);
    setHover(null);
  };
  const onPointerMove = () => {
    const was = gate.open;
    gate.pointer();
    if (!was && gate.open) report.show();
  };
  el.addEventListener('pointermove', onPointerMove);
  const destroy = () => {
    report.cancel();
    el.removeEventListener('pointermove', onPointerMove);
  };
  return { stop, destroy };
}
