/**
 * A staggered change: many edges switched on or off at once change a batch per
 * frame (`EXPLORER.motion.revealBatch`), each batch inside a Cytoscape batch (no per-edge
 * fade: a style bypass per edge costs more than the batch). A new view or a new run
 * finishes the one in flight at once (`flush`).
 */
import type cytoscape from 'cytoscape';
import { EXPLORER } from '../explorer-config';

/** The change in flight: the frame that runs its next batch, and a way to finish it now. */
type Pending = { raf: number; rest: () => void };
/** The one slot for the change in flight, which every run's frames reschedule through. */
type Slot = { job: Pending | null };
/** A staggered change: `step` runs over `all` a batch at a time, then `end`. */
type Staggered<T> = { all: T[]; step: (chunk: T[]) => void; end: () => void };

/**
 * Each call steps over the next `count` items in one Cytoscape batch; how many are left
 * (zero or less once at or past the end).
 */
function batcher<T>(cy: cytoscape.Core, all: T[], step: (chunk: T[]) => void) {
  let i = 0;
  return (count: number) => {
    const chunk = all.slice(i, (i += count));
    cy.batch(() => step(chunk));
    return all.length - i;
  };
}

function startBatches<T>(cy: cytoscape.Core, { all, step, end }: Staggered<T>, slot: Slot) {
  const batch = batcher(cy, all, step);
  const tick = () => {
    if (batch(EXPLORER.motion.revealBatch) <= 0) {
      slot.job = null;
      return end();
    }
    if (!slot.job) throw new Error('stagger: a batch is left but no change is in flight');
    slot.job.raf = requestAnimationFrame(tick);
  };
  const rest = () => {
    batch(all.length);
    end();
  };
  slot.job = { raf: requestAnimationFrame(tick), rest };
}

export function createStagger(cy: cytoscape.Core) {
  const slot: Slot = { job: null };
  /** Stop the change in flight from running its next frame; that change, if any. */
  const take = () => {
    const p = slot.job;
    slot.job = null;
    if (p) cancelAnimationFrame(p.raf);
    return p;
  };
  /** Finish the change in flight, then run `step` over `all` a batch per frame, then `end`. */
  const run = <T>(all: T[], step: (chunk: T[]) => void, end: () => void) => {
    take()?.rest();
    startBatches(cy, { all, step, end }, slot);
  };
  return { run, flush: () => take()?.rest(), cancel: () => void take() };
}

export type Stagger = ReturnType<typeof createStagger>;
