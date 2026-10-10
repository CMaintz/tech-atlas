/**
 * Switching palettes in place: the stylesheet, and every colour held in element
 * data (edges, bundles, names). No relayout. Term fills come from the View's `colour`,
 * so the caller applies a view with the new theme's colours as well.
 */
import { clusterColour, homeDomain, type MapTheme } from '../graph-style';
import { edgeData } from '../graph-cytoscape';
import type { MapParts } from './context';
import { bundleGradient } from './elements';
import { mapStylesheet } from './style';
import { tagColour } from './tags';

function rethemeLinks(p: MapParts, theme: MapTheme) {
  const paint = edgeData(
    p.graph.links,
    (id) => p.byId.get(id),
    () => 0,
    0,
    theme,
  );
  p.links.forEach((e) => {
    const c = paint[Number(e.id().slice(1))];
    const s = p.byId.get(e.data('source'))!;
    e.data({
      colour: c.colour,
      gradient: c.gradient,
      tint: clusterColour(s.cluster, homeDomain(s), theme),
    });
  });
}

const rethemeBundles = (p: MapParts, theme: MapTheme) =>
  p.bundleEdges.forEach((e) => {
    e.data({
      colour: clusterColour(e.data('a'), undefined, theme),
      gradient: bundleGradient(e.data('a'), e.data('b'), theme),
    });
  });

export function retheme(p: MapParts, theme: MapTheme) {
  p.cy.batch(() => {
    rethemeLinks(p, theme);
    rethemeBundles(p, theme);
    p.cy.nodes('.tag').forEach((n) => void n.data('colour', tagColour(n.id(), theme)));
  });
  p.cy.style(mapStylesheet(theme, p.opts.variant));
}
