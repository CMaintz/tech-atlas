/**
 * A staggered change: many edges switched on or off at once change a batch per
 * frame (`EXPLORER.motion.revealBatch`), each batch inside a Cytoscape batch (no per-edge
 * fade: a style bypass per edge costs more than the batch). A new view finishes the one
 * in flight at once (`flush`).
 */
import type cytoscape from 'cytoscape';
import { EXPLORER } from '../explorer-config';

export function createStagger(cy: cytoscape.Core) {
  /** The change in flight: its remaining batches, and the frame that runs the next. */
  let pending: { rest: () => void; raf: number } | null = null;
  const flush = () => {
    if (!pending) return;
    cancelAnimationFrame(pending.raf);
    const p = pending;
    pending = null;
    p.rest();
  };
  /** Run `step` over `all` a batch per frame, then `end`. */
  const run = <T>(all: T[], step: (chunk: T[]) => void, end: () => void) => {
    let i = 0;
    const batch = (count: number) => {
      const chunk = all.slice(i, (i += count));
      cy.batch(() => step(chunk));
    };
    const tick = () => {
      batch(EXPLORER.motion.revealBatch);
      if (i < all.length) pending!.raf = requestAnimationFrame(tick);
      else {
        pending = null;
        end();
      }
    };
    const rest = () => {
      batch(all.length - i);
      end();
    };
    pending = { raf: requestAnimationFrame(tick), rest };
  };
  const cancel = () => {
    if (pending) cancelAnimationFrame(pending.raf);
    pending = null;
  };
  return { run, flush, cancel };
}

export type Stagger = ReturnType<typeof createStagger>;
