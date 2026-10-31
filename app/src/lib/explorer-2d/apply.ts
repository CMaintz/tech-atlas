/**
 * Applying a view in place: domain toggles hide terms where they are, only a
 * layout switch moves them; colours, edges and the selection's look follow; a new
 * selection glides into view (layout and filter changes frame it themselves).
 */
import { getOrThrow } from '../map-get';
import { centreOn, frame } from './camera';
import { layoutChanged, type MapParts, type MapState, type ViewChange } from './context';
import type { HoverPart } from './hover';
import { createFocus, type FocusDeps } from './focus';
import { refreshTags, type Place } from './placement';
import { fadeOut, fadingEdges, revealEdges, type RevealDeps } from './reveal';
import type { View } from './types';

export type ApplyDeps = Omit<RevealDeps, 'paintFocus'> &
  FocusDeps & {
    place: Place;
    hover: HoverPart;
    recull: (force?: boolean) => void;
  };

/** What applying a view works with: the map, its state, its parts and the focus painter. */
type Applying = { p: MapParts; s: MapState; d: ApplyDeps; focus: (next: View) => void };

/** Show and hide terms; a layout switch also relabels them (years in the time layout). */
function showTerms(p: MapParts, next: View, relabel: boolean) {
  const { byId, opts } = p;
  p.cy.batch(() => {
    p.terms.forEach((n) => void n.toggleClass('gone', !next.nodes.has(n.id())));
    if (relabel)
      p.terms.forEach((n) => {
        const g = getOrThrow(byId, n.id(), 'term');
        const name = g.term[opts.lang];
        n.data('label', next.layout === 'time' && g.era ? `${name} (${g.era})` : name);
      });
  });
}

/** Each term's fill, and its ring when it belongs to another domain too, when they change. */
function paintTerms(p: MapParts, { prev, next }: ViewChange) {
  if (prev && prev.colour === next.colour && prev.bands === next.bands) return;
  p.cy.batch(() =>
    p.terms.forEach((n) => {
      const g = getOrThrow(p.byId, n.id(), 'term');
      n.data('colour', next.colour(g));
      const ring = next.bands(g)[1];
      if (ring) n.data('ring', ring);
      else if (n.data('ring')) n.removeData('ring');
    }),
  );
}

/** Terms shown and where they sit, when the layout, the terms or the domains change. */
function placeTerms(p: MapParts, d: ApplyDeps, c: ViewChange) {
  const { prev, next } = c;
  const relaid = layoutChanged(c);
  if (prev && !relaid && prev.nodes === next.nodes && prev.domains === next.domains) return;
  showTerms(p, next, relaid);
  d.refreshEdges();
  if (relaid) d.place(next, !!prev);
  else refreshTags(p, next);
}

/** Edges, focus and (after a filter change) the frame, once families have faded. */
function finish({ p, s, d, focus }: Applying, c: ViewChange) {
  // A fade can end after a newer view has been applied: restyle up to the view now, or
  // this change's routing turns back on bundled routes the newer view cleared.
  const now: ViewChange = { prev: c.prev, next: s.view ?? c.next };
  revealEdges({ p, s, d: { ...d, paintFocus: () => focus(now.next) } }, now);
  // Only this change's own filter is framed here: a newer filter frames itself.
  if (c.prev && !layoutChanged(c) && c.prev.nodes !== c.next.nodes) {
    d.recull(true);
    frame(p, s);
  }
}

/** A new selection glides into view; layout and filter changes frame it themselves. */
function centreSelection(p: MapParts, { prev, next }: ViewChange) {
  const moved = !prev || prev.layout !== next.layout || prev.nodes !== next.nodes;
  if (next.selected && next.selected !== prev?.selected && !moved) centreOn(p, next.selected);
}

export function createApply(p: MapParts, s: MapState, d: ApplyDeps) {
  const applying: Applying = { p, s, d, focus: createFocus(p, s, d) };
  let familiesNow: ReadonlySet<string> | null = null;
  return (next: View) => {
    const c: ViewChange = { prev: s.view, next };
    s.view = next;
    d.hover.unhover();
    placeTerms(p, d, c);
    paintTerms(p, c);
    const fading = fadingEdges(p, c.prev && familiesNow, next);
    familiesNow = next.families;
    d.stagger.flush();
    if (fading.nonempty()) fadeOut(fading, () => finish(applying, c));
    else finish(applying, c);
    centreSelection(p, c);
  };
}
