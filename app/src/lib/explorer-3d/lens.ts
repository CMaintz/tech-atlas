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

type Neighbours = Map<string, Set<string>>;
/** The hovered term's neighbourhood, if a term is hovered. */
type Hood = () => Set<string> | undefined;

/** A lit link: in the hovered neighbourhood, else along the route, else at the selection. */
const focusOn = (s: State3, hood: Hood) => (l: Ends) => {
  if (!s.view) return false;
  const [a, b] = endsOf(l);
  if (s.cluster) return false;
  const h = hood();
  if (h) return h.has(a) && h.has(b) && (s.fx.hood === a || s.fx.hood === b);
  const { selected, highlight } = s.view;
  if (highlight.size) return highlight.has(a) && highlight.has(b);
  return a === selected || b === selected;
};

/**
 * Receded terms: outside a hovered cluster name's cluster, else outside the hovered
 * neighbourhood, else outside a route, else (with a term selected) everything not
 * connected to it (unless the whole shown neighbourhood is lit). A term hovered over a
 * selection or route comes forward on its own.
 */
const fadedOn = (s: State3, neighbours: Neighbours, hood: Hood) => (id: string) => {
  if (s.cluster) return !s.cluster.ids.has(id);
  const h = hood();
  if (h) return !h.has(id);
  if (!s.view || id === s.fx.preview) return false;
  if (s.view.highlight.size) return !s.view.highlight.has(id);
  if (s.view.hoodLit) return false;
  if (s.view.selected) return !neighbours.get(s.view.selected)?.has(id);
  return false;
};

/** The families filter the overview only: a selected term shows all its relationships. */
const endsShownOn = (s: State3) => (l: Ends & { family: string }) => {
  if (!s.view) return false;
  const [a, b] = endsOf(l);
  const { selected, families } = s.view;
  const inFamily = families.has(l.family) || a === selected || b === selected;
  return linkVisible({ source: a, target: b }, s.view.nodes) && inFamily;
};

export function createLens(neighbours: Neighbours, s: State3) {
  const hood = () => (s.fx.hood ? neighbours.get(s.fx.hood) : undefined);
  const core = {
    focusOf: focusOn(s, hood),
    faded: fadedOn(s, neighbours, hood),
    endsShown: endsShownOn(s),
  };
  return { ...core, ...derived(s, core) };
}

type Core = {
  focusOf: (l: Link3) => boolean;
  faded: (id: string) => boolean;
  endsShown: (l: Link3) => boolean;
};

function derived(s: State3, { focusOf, faded, endsShown }: Core) {
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
      if (faded(n.id)) return ink.faded3d;
      // 3d-force-graph colours only visible terms, and none is visible before a view.
      if (!s.view) throw new Error('3D map: a term coloured before any view was shown');
      return s.view.colour(n);
    },
  };
}

export type Lens = ReturnType<typeof createLens>;
