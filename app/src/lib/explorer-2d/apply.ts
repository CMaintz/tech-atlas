/**
 * Applying a view in place: domain toggles hide terms where they are, only a
 * layout switch moves them; colours, edges and the selection's look follow; a new
 * selection glides into view (layout and filter changes frame it themselves).
 */
import { centreOn, frame } from './camera';
import type { MapParts, MapState } from './context';
import type { HoverPart } from './hover';
import { paintFocus, type Crowd } from './focus';
import { refreshTags, type Place } from './placement';
import { fadeOut, fadingEdges, revealEdges, type RevealDeps } from './reveal';
import type { View } from './types';

export type ApplyDeps = Omit<RevealDeps, 'paintFocus'> & {
  place: Place;
  hover: HoverPart;
  recull: (force?: boolean) => void;
  paintNames: () => void;
  /** v2: the neighbours' names a selection hides where they would overlap. */
  crowd?: Crowd;
};

/** Show and hide terms; a layout switch also relabels them (years in the time layout). */
function showTerms(p: MapParts, next: View, layoutChanged: boolean) {
  const { byId, opts } = p;
  p.cy.batch(() => {
    p.terms.forEach((n) => void n.toggleClass('gone', !next.nodes.has(n.id())));
    if (layoutChanged)
      p.terms.forEach((n) => {
        const g = byId.get(n.id())!;
        const name = g.term[opts.lang];
        n.data('label', next.layout === 'time' && g.era ? `${name} (${g.era})` : name);
      });
  });
}

/** Each term's fill, and its ring when it belongs to another domain too. */
const paintTerms = (p: MapParts, next: View) =>
  p.cy.batch(() =>
    p.terms.forEach((n) => {
      const g = p.byId.get(n.id())!;
      n.data('colour', next.colour(g));
      const ring = next.bands(g)[1];
      if (ring) n.data('ring', ring);
      else if (n.data('ring')) n.removeData('ring');
    }),
  );

/** Terms shown and where they sit, when the layout, the terms or the domains change. */
function placeTerms(p: MapParts, d: ApplyDeps, prev: View | null, next: View) {
  const layoutChanged = !prev || prev.layout !== next.layout;
  if (!layoutChanged && prev.nodes === next.nodes && prev.domains === next.domains) return;
  showTerms(p, next, layoutChanged);
  d.refreshEdges();
  if (layoutChanged) d.place(next, !!prev);
  else refreshTags(p, next);
}

/** Edges, focus and (after a filter change) the frame, once families have faded. */
function finish(p: MapParts, s: MapState, d: ApplyDeps, prev: View | null, next: View) {
  const focus = () => paintFocus(p, s, next, d.paintNames, d.crowd);
  revealEdges(p, s, { ...d, paintFocus: focus }, prev, next);
  const layoutChanged = !prev || prev.layout !== next.layout;
  if (!layoutChanged && prev.nodes !== next.nodes) {
    d.recull(true);
    frame(p, s);
  }
}

export function createApply(p: MapParts, s: MapState, d: ApplyDeps) {
  let familiesNow: ReadonlySet<string> | null = null;
  return (next: View) => {
    const prev = s.view;
    s.view = next;
    d.hover.unhover();
    placeTerms(p, d, prev, next);
    if (!prev || prev.colour !== next.colour || prev.bands !== next.bands) paintTerms(p, next);
    const fading = fadingEdges(p, prev && familiesNow, next);
    familiesNow = next.families;
    d.stagger.flush();
    if (fading.nonempty()) fadeOut(fading, () => finish(p, s, d, prev, next));
    else finish(p, s, d, prev, next);
    const moved = !prev || prev.layout !== next.layout || prev.nodes !== next.nodes;
    if (next.selected && next.selected !== prev?.selected && !moved) centreOn(p, next.selected);
  };
}
