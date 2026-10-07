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

/** The lit terms whose names would overlap (v2 hides them); none by default. */
export type Crowd = (lit: cytoscape.NodeCollection) => cytoscape.NodeCollection;

/** The selected term first, then bigger terms: whose names win where they overlap. */
const selFirst =
  (sel: cytoscape.NodeSingular) => (a: cytoscape.NodeSingular, b: cytoscape.NodeSingular) =>
    a.same(sel) ? -1 : b.same(sel) ? 1 : b.data('size') - a.data('size');

/** A selection: the term, its visible neighbours (or the whole shown neighbourhood) stay lit. */
function dimForSelection(p: MapParts, s: MapState, next: View, crowd?: Crowd) {
  const sel = p.cy.getElementById(next.selected ?? '');
  if (sel.empty() || sel.hasClass('gone')) return;
  const edges = next.hoodLit ? s.shown.edges() : sel.connectedEdges();
  const shownEdges = edges.filter((e) => !e.hasClass('off'));
  const hood = (next.hoodLit ? s.shown.nodes('[size]') : shownEdges.connectedNodes()).union(sel);
  s.shown.not(hood).not(shownEdges).addClass('dim');
  p.cy.nodes('.tag').addClass('dim');
  hood.not(sel).addClass('nb');
  const lit = hood.nodes('[size]').sort(selFirst(sel)) as cytoscape.NodeCollection;
  crowd?.(lit).addClass('nbhide');
}

/** Paint the view's selection or route (and the relationship names that go with it). */
export const paintFocus = (
  p: MapParts,
  s: MapState,
  next: View,
  paintNames: () => void,
  crowd?: Crowd,
) =>
  p.cy.batch(() => {
    p.cy.elements('.sel, .hl, .dim, .nb, .nbhide').removeClass('sel hl dim nb nbhide');
    if (next.highlight.size) dimForRoute(p, s, next.highlight);
    else if (next.selected) dimForSelection(p, s, next, crowd);
    if (next.selected) p.cy.getElementById(next.selected).removeClass('dim').addClass('sel');
    paintNames();
  });
