/**
 * Hover: with nothing selected, a hovered term lights its neighbourhood and the
 * rest fades; with a term selected (or a route shown) the selection's look stays and
 * hover only brings the hovered term forward.
 */
import type cytoscape from 'cytoscape';
import { EXPLORER } from '../explorer-config';
import { cullLabels } from '../graph-style';
import { linkVisible } from '../graph-layout';
import { effectiveFocus } from '../explorer-focus';
import { linkOf, type MapParts, type MapState } from './context';
import { FAR_ZOOM, termLabelBox, type LabelWidth } from './labels';
import type { View } from './types';

type HoverDeps = { paintNames: () => void; labelWidth: LabelWidth };
/** What hover works with: the map, its state and the parts it calls. */
type Hovering = { p: MapParts; s: MapState; d: HoverDeps };

/** Over a selection: the hovered term and its link to the selection come forward. */
function preview(p: MapParts, n: cytoscape.NodeSingular, sel: string | null) {
  p.cy.batch(() => {
    n.addClass('pv');
    if (sel) n.edgesWith(p.cy.getElementById(sel)).not('.off').addClass('pv');
  });
}

/** A term's neighbourhood, with the hidden edges hover reveals (visible ends, family on). */
function hoodOf(p: MapParts, n: cytoscape.NodeSingular, v: View) {
  const extra = n
    .connectedEdges('.off')
    .filter(
      (e) =>
        linkVisible({ source: e.data('source'), target: e.data('target') }, v.nodes) &&
        v.families.has(linkOf(p, e).family),
    );
  const hood = n.closedNeighborhood().filter((el) => !el.hasClass('off') || extra.contains(el));
  return { extra, hood };
}

/** The lit terms' labels that would overlap (the hovered term, then bigger terms, win). */
export function crowdedLabels(p: MapParts, lit: cytoscape.NodeCollection, width: LabelWidth) {
  const far = p.cy.zoom() < FAR_ZOOM;
  const fontOf = (m: cytoscape.NodeSingular): number =>
    far ? m.data('hoverFont') : m.data('font');
  const hidden = cullLabels(lit.map((m) => ({ id: m.id(), ...termLabelBox(m, fontOf(m), width) })));
  return lit.filter((m) => hidden.has(m.id()));
}

/** Light a term's neighbourhood in view `v` and fade the rest. */
function lightHood({ p, s, d }: Hovering, n: cytoscape.NodeSingular, v: View) {
  const { extra, hood } = hoodOf(p, n, v);
  const lit = hood
    .nodes('[size]')
    .sort((a, b) => (a.same(n) ? -1 : b.same(n) ? 1 : b.data('size') - a.data('size')));
  const crowded = crowdedLabels(p, lit, d.labelWidth);
  p.cy.batch(() => {
    extra.removeClass('off').addClass('hoverlink');
    s.shown.not(hood).addClass('faded');
    p.cy.nodes('.tag').addClass('faded');
    hood.addClass('lit');
    crowded.addClass('hoverhide');
  });
}

/** Hover a term: its neighbourhood, or a preview over a selection. */
function hover(h: Hovering, n: cytoscape.NodeSingular) {
  const { p, s, d } = h;
  const v = s.view;
  if (!v) return;
  s.hovered = n;
  p.opts.container.style.cursor = 'pointer';
  const f = effectiveFocus({
    selected: v.selected,
    route: v.highlight.size > 0,
    hovered: n.id(),
    moving: false,
  });
  if (f.hood) {
    lightHood(h, n, v);
    d.paintNames();
  } else if (f.preview) preview(p, n, v.selected);
}

/** Undo the hover's look. */
function unhover({ p, s, d }: Hovering) {
  if (!s.hovered) return;
  const was = s.hovered;
  s.hovered = null;
  p.cy.batch(() => {
    p.cy.elements('.pv').removeClass('pv');
    s.shown.removeClass('faded lit');
    p.cy.nodes('.hoverhide').removeClass('hoverhide');
    // Edges revealed only for the hover go back to hidden.
    was.connectedEdges('.hoverlink').removeClass('hoverlink').addClass('off');
    p.cy.nodes('.tag').removeClass('faded');
  });
  d.paintNames();
  p.opts.container.style.cursor = 'grab';
}

/** Tell the Explorer the pointer is over a term (to prefetch it, and for the hover card). */
function report(p: MapParts, n: cytoscape.NodeSingular) {
  p.opts.onHover?.(n.id());
  const at = n.renderedPosition();
  p.opts.onPoint?.({ id: n.id(), x: at.x, y: at.y });
}

/**
 * Hover with a little intent: `point` reports the term at once (prefetch, hover card) and
 * hovers it after `EXPLORER.hoverDelayMs`; `unhover` cancels a pending hover too.
 */
export function createHover(p: MapParts, s: MapState, d: HoverDeps) {
  const h: Hovering = { p, s, d };
  let timer = 0;
  const off = () => {
    window.clearTimeout(timer);
    unhover(h);
  };
  const point = (n: cytoscape.NodeSingular) => {
    report(p, n);
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (s.hovered?.same(n)) return;
      off();
      hover(h, n);
    }, EXPLORER.hoverDelayMs);
  };
  return { point, unhover: off, stop: () => window.clearTimeout(timer) };
}

export type HoverPart = ReturnType<typeof createHover>;
