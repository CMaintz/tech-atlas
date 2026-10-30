/**
 * Showing a new View on the 3D map: the overview's backbone for the shown terms and
 * families, what 3d-force-graph must re-evaluate, framing, and the glide to a newly
 * selected term.
 */
import { backboneOf } from '../graph-layout';
import { refocus } from './lens';
import type { Ctx } from './context';
import type { Painter } from './paint';
import type { View3D } from './types';

/**
 * Only the relationship types or "show all" changed, with nothing focused: no
 * 3d-force-graph object can change, so its accessors need no re-evaluating and the web
 * may be revealed a batch per frame.
 */
export function onlyToggled(prev: View3D | null, next: View3D, hovering: boolean) {
  return (
    !!prev &&
    prev.nodes === next.nodes &&
    !hovering &&
    prev.selected === next.selected &&
    prev.highlight === next.highlight &&
    !next.highlight.size &&
    prev.colour === next.colour &&
    prev.bands === next.bands
  );
}

/** Mark the overview's backbone, over the shown terms only (none stranded by a hidden domain). */
function markBackbone({ opts, model }: Ctx, next: View3D) {
  const spine = backboneOf(opts.graph.nodes, opts.graph.links, next);
  for (const l of model.links) l.bb = spine.has(l.i);
}

type Framing = { resize: () => void; flyTo: (id: string) => void };
/** What showing a View moves: our painter and the camera. */
type Shown = { painter: Painter; camera: Framing };
type Change = { prev: View3D | null; next: View3D };

function repaint(ctx: Ctx, painter: Painter, { prev, next }: Change) {
  const { fg } = ctx;
  if (prev?.families !== next.families || prev?.nodes !== next.nodes) markBackbone(ctx, next);
  if (!prev || prev.nodes !== next.nodes) fg.nodeVisibility(fg.nodeVisibility());
  if (onlyToggled(prev, next, !!ctx.state.fx.hood)) painter.paint(true);
  else painter.refresh();
}

function reframe(camera: Framing, { prev, next }: Change) {
  // Opening or closing the term panel changes the part of the canvas left clear.
  if (!!next.selected !== !!prev?.selected) camera.resize();
  if (next.selected && next.selected !== prev?.selected) camera.flyTo(next.selected);
}

export function applyView(ctx: Ctx, { painter, camera }: Shown, next: View3D) {
  const change = { prev: ctx.state.view, next };
  ctx.state.view = next;
  refocus(ctx.state, ctx.gate);
  repaint(ctx, painter, change);
  reframe(camera, change);
}
