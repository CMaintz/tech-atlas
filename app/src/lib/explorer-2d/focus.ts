/**
 * The selection and route look: everything not connected recedes, while the selected
 * term, its visible neighbours and the edges between them (or a route's terms and edges)
 * stay fully lit.
 */
import type cytoscape from 'cytoscape';
import type { MapParts, MapState } from './context';
import type { View } from './types';

/** A route: its terms and their edges lit, the rest dimmed. */
function dimForRoute(p: MapParts, s: MapState, route: ReadonlySet<string>) {
  s.shown.addClass('dim');
  p.cy.nodes('.tag').addClass('dim');
  p.terms
    .filter((n) => route.has(n.id()))
    .removeClass('dim')
    .addClass('hl');
  s.shown.edges('.focus').removeClass('dim').addClass('hl');
}

/** A selection: the term, its visible neighbours and the edges between them stay lit. */
function dimForSelection(p: MapParts, s: MapState, selected: string) {
  const sel = p.cy.getElementById(selected);
  if (sel.empty() || sel.hasClass('gone')) return;
  const edges = sel.connectedEdges().filter((e) => !e.hasClass('off'));
  const hood = edges.connectedNodes().union(sel) as cytoscape.Collection;
  s.shown.not(hood).not(edges).addClass('dim');
  p.cy.nodes('.tag').addClass('dim');
  hood.not(sel).addClass('nb');
}

/** Paint the view's selection or route (and the relationship names that go with it). */
export const paintFocus = (p: MapParts, s: MapState, next: View, paintNames: () => void) =>
  p.cy.batch(() => {
    p.cy.elements('.sel, .hl, .dim, .nb').removeClass('sel hl dim nb');
    if (next.highlight.size) dimForRoute(p, s, next.highlight);
    else if (next.selected) dimForSelection(p, s, next.selected);
    if (next.selected) p.cy.getElementById(next.selected).removeClass('dim').addClass('sel');
    paintNames();
  });
