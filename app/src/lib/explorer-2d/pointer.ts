/**
 * The pointer on the 2D map: pressing and panning the background (with the drag ring),
 * hovering terms and named links, tapping to select and double-tapping to open.
 * No hover while a button is down or the map moves: restyling mid-pan throws away
 * the viewport snapshot, and Cytoscape does not re-report a term the view slid under a
 * resting pointer, so hover waits until the pointer itself moves once the map stops.
 */
import type cytoscape from 'cytoscape';
import { EXPLORER } from '../explorer-config';
import { createDragFeedback, type DragFeedback } from '../drag-feedback';
import { createMotionGate, type MotionGate } from '../explorer-focus';
import type { MapParts, MapState } from './context';
import type { HoverPart } from './hover';
import type { RelationNamesPart } from './relation-names';

type PointerDeps = { hover: HoverPart; names: RelationNamesPart };
/** A button is down; the term under the pointer, hovered or not. */
type Pointer = { pressing: boolean; under: cytoscape.NodeSingular | null };

/** Only a press on the background pans: an open hand at rest, a closed one and a ring. */
function bindPress(p: MapParts, ptr: Pointer, drag: DragFeedback) {
  p.cy.on('tapstart', (e) => {
    ptr.pressing = true;
    p.opts.onPoint?.(null);
    const ev = e.originalEvent as (MouseEvent & { pointerType?: string }) | TouchEvent | undefined;
    if (e.target !== p.cy || !ev) return;
    if ('touches' in ev) {
      const t = ev.touches[0];
      if (t) drag.start('pan', { clientX: t.clientX, clientY: t.clientY, pointerType: 'touch' });
    } else if (ev.button === 0) drag.start('pan', ev);
  });
  p.cy.on('tapend', () => {
    ptr.pressing = false;
    drag.end();
  });
}

/**
 * `moved` marks the map moving (a pan, the wheel, a glide to a term, keys or a layout
 * change): hover ends, and returns once the map has been still for a moment.
 */
function createMotion(p: MapParts, s: MapState, deps: PointerDeps) {
  const gate = createMotionGate();
  let quiet = 0;
  const moved = () => {
    if (gate.motion(true)) {
      deps.hover.unhover();
      p.opts.onPoint?.(null);
    }
    window.clearTimeout(quiet);
    quiet = window.setTimeout(() => {
      if (s.moving) return moved();
      gate.motion(false);
      // Names are sized for the zoom: re-place them once it settles.
      if (deps.names.named().nonempty()) deps.names.paint();
    }, EXPLORER.edgeLabels.quietMs);
  };
  return { gate, moved, stop: () => window.clearTimeout(quiet) };
}

/** Hover terms under a still pointer; returns the pointermove listener to remove. */
function bindTermHover(p: MapParts, ptr: Pointer, gate: MotionGate, hover: HoverPart) {
  p.cy.on('mouseover', 'node[size]', (e) => {
    ptr.under = e.target as cytoscape.NodeSingular;
    if (ptr.pressing || !gate.open) return;
    hover.point(ptr.under);
  });
  p.cy.on('mouseout', 'node[size]', () => {
    ptr.under = null;
    hover.unhover();
    p.opts.onPoint?.(null);
  });
  const onPointerMove = () => {
    const was = gate.open;
    gate.pointer();
    if (!was && gate.open && ptr.under && !ptr.pressing) hover.point(ptr.under);
  };
  p.opts.container.addEventListener('pointermove', onPointerMove);
  return onPointerMove;
}

/** A named link under the pointer shows its own name; taps select and open terms. */
function bindLinksAndTaps(p: MapParts, ptr: Pointer, gate: MotionGate, names: RelationNamesPart) {
  p.cy.on('mouseover', 'edge', (e) => {
    if (gate.open && !ptr.pressing && names.named().contains(e.target)) e.target.addClass('rlh');
  });
  p.cy.on('mouseout', 'edge', (e) => void e.target.removeClass('rlh'));
  p.cy.on('tap', 'node[size]', (e) => p.opts.onSelect(e.target.id()));
  p.cy.on('tap', (e) => e.target === p.cy && p.opts.onSelect(null));
  p.cy.on('dbltap', 'node[size]', (e) => p.opts.onOpen(e.target.id()));
}

/** Wire the pointer to the map; `moved` is also called when the map is moved in code. */
export function bindPointer(p: MapParts, s: MapState, deps: PointerDeps) {
  const ptr: Pointer = { pressing: false, under: null };
  p.opts.container.style.cursor = 'grab';
  const drag = createDragFeedback(p.opts.container);
  bindPress(p, ptr, drag);
  const motion = createMotion(p, s, deps);
  p.cy.on('viewport', () => {
    p.opts.onPoint?.(null);
    motion.moved();
  });
  const onPointerMove = bindTermHover(p, ptr, motion.gate, deps.hover);
  bindLinksAndTaps(p, ptr, motion.gate, deps.names);
  const destroy = () => {
    motion.stop();
    p.opts.container.removeEventListener('pointermove', onPointerMove);
    drag.destroy();
  };
  return { moved: motion.moved, destroy };
}
