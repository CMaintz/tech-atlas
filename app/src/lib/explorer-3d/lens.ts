/**
 * What the 3D map lights and recedes, read from its state: the hovered
 * neighbourhood, a selection or a route, and which links the filters let through.
 * Pure over the state it is given, so the paint modules and the lab share one answer.
 */
import { MAP_INK } from '../graph-style';
import { linkVisible } from '../graph-layout';
import { effectiveFocus, type MotionGate } from '../explorer-focus';
import type { GraphNode } from '../graph-model';
import { endId } from './model';
import type { Link3, State3 } from './types';

/** The current palette's inks, and whether it is the cream map. */
export const inkOf = (ctx: { state: State3 }) => MAP_INK[ctx.state.theme];
export const isLight = (ctx: { state: State3 }) => ctx.state.theme === 'light';

type Ends = { source: unknown; target: unknown };
const endsOf = (l: Ends) => [endId(l.source), endId(l.target)] as const;

/** Hover yields to the selection or route, and is off while the map moves. */
export function refocus(s: State3, gate: MotionGate) {
  s.fx = effectiveFocus({
    selected: s.view?.selected ?? null,
    route: !!s.view?.highlight.size,
    hovered: s.hoverId,
    moving: !gate.open,
  });
}

export function createLens(neighbours: Map<string, Set<string>>, s: State3) {
  const hood = () => (s.fx.hood ? neighbours.get(s.fx.hood) : undefined);
  /** A lit link: in the hovered neighbourhood, else at the selection or along the route. */
  const focusOf = (l: Ends) => {
    if (!s.view) return false;
    const [a, b] = endsOf(l);
    const h = hood();
    if (h) return h.has(a) && h.has(b) && (s.fx.hood === a || s.fx.hood === b);
    const { selected, highlight } = s.view;
    return a === selected || b === selected || (highlight.has(a) && highlight.has(b));
  };
  /**
   * Receded terms: outside the hovered neighbourhood, else outside a route, else —
   * with a term selected — everything not connected to it. A term hovered over a
   * selection or route comes forward on its own.
   */
  const faded = (id: string) => {
    const h = hood();
    if (h) return !h.has(id);
    if (!s.view || id === s.fx.preview) return false;
    if (s.view.highlight.size) return !s.view.highlight.has(id);
    if (s.view.selected) return !neighbours.get(s.view.selected)?.has(id);
    return false;
  };
  /** The families filter the overview only: a selected term shows all its relationships. */
  const endsShown = (l: Ends & { family: string }) => {
    if (!s.view) return false;
    const [a, b] = endsOf(l);
    const { selected, families } = s.view;
    const inFamily = families.has(l.family) || a === selected || b === selected;
    return linkVisible({ source: a, target: b }, s.view.nodes) && inFamily;
  };
  return { focusOf, faded, endsShown, ...derived(s, focusOf, faded, endsShown) };
}

function derived(
  s: State3,
  focusOf: (l: Link3) => boolean,
  faded: (id: string) => boolean,
  endsShown: (l: Link3) => boolean,
) {
  return {
    /** Drawn in the overview (the backbone, or every link with "show all"). */
    drawn: (l: Link3) => !!s.view && endsShown(l) && (s.view.showAll || l.bb),
    /** Either end receded. */
    dimmed: (l: Link3) => faded(endId(l.source)) || faded(endId(l.target)),
    /** A lit link, drawn by 3d-force-graph (arrows); the rest are the merged web. */
    linkShown: (l: Link3) => endsShown(l) && focusOf(l),
    nodeColour: (n: GraphNode) => {
      const ink = inkOf({ state: s });
      if (n.id === s.view?.selected) return ink.selected;
      return faded(n.id) ? ink.faded3d : s.view!.colour(n);
    },
  };
}

export type Lens = ReturnType<typeof createLens>;
