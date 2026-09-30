/**
 * Relationship names on the lit links: the selected term's links, or a hovered
 * term's when it has few, each named from that term's side. Names that would overlap give
 * way to heavier links, and the link under the pointer shows its own. A constant size on
 * screen when zoomed out.
 */
import type cytoscape from 'cytoscape';
import { EXPLORER } from '../explorer-config';
import {
  cullBoxes,
  effectiveFocus,
  labelPov,
  relationLabel,
  rotatedSize,
  type RelationNames,
} from '../explorer-focus';
import { linkOf, type MapParts, type MapState } from './context';
import type { View } from './types';

/** A term's drawn relationship edges. */
const litOf = (p: MapParts, id: string) =>
  p.cy.getElementById(id).connectedEdges().intersection(p.links).not('.off');

/** The term whose links are named (the selection, or a hovered term with few), if any. */
function povOf(p: MapParts, s: MapState, v: View) {
  const f = effectiveFocus({
    selected: v.selected,
    route: v.highlight.size > 0,
    hovered: s.hovered?.id() ?? null,
    moving: false,
  });
  const hoodLinks = f.hood ? litOf(p, f.hood).length : 0;
  const pov = labelPov(f, v.selected, hoodLinks, EXPLORER.edgeLabels.hoverMax);
  const node = pov ? p.cy.getElementById(pov) : null;
  return !pov || !node || node.empty() || node.hasClass('gone') ? null : pov;
}

/** Write each of `pov`'s links' names and show those that do not overlap. */
function nameLinks(p: MapParts, pov: string, names: RelationNames) {
  const size = EXPLORER.edgeLabels.px2d / Math.min(1, p.cy.zoom());
  const edges = litOf(p, pov)
    .toArray()
    .map((e) => ({ e, l: linkOf(p, e) }))
    .sort((a, b) => b.l.weight - a.l.weight);
  const boxes = edges.map(({ e, l }) => {
    const text = relationLabel(l, pov, names.label, names.inverse);
    e.data({ rel: text, relFont: size });
    const a = e.source().position();
    const b = e.target().position();
    const r = rotatedSize(text.length * size * 0.55, size * 1.3, Math.atan2(b.y - a.y, b.x - a.x));
    return { id: e.id(), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 6, ...r };
  });
  const kept = cullBoxes(boxes);
  const named = p.cy.collection(edges.map(({ e }) => e)) as cytoscape.EdgeCollection;
  named.filter((e) => kept.has(e.id())).addClass('rl');
  return named;
}

/** `paint` re-places the names for the current view and hover; `named` the named links. */
export function createRelationNames(p: MapParts, s: MapState) {
  let named = p.cy.collection() as cytoscape.EdgeCollection;
  const paint = () =>
    p.cy.batch(() => {
      p.cy.edges('.rl, .rlh').removeClass('rl rlh');
      named = p.cy.collection() as cytoscape.EdgeCollection;
      const names = p.opts.relationNames;
      const pov = names && s.view ? povOf(p, s, s.view) : null;
      if (names && pov) named = nameLinks(p, pov, names);
    });
  return { paint, named: () => named };
}

export type RelationNamesPart = ReturnType<typeof createRelationNames>;
