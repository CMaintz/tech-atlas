/**
 * Term labels (A74): zoomed out only hubs keep a (larger) label; labels that would be too
 * small or would overlap a bigger term's, or a name above an island, are not drawn. The
 * cull runs over visible terms once the zoom settles, never mid-gesture.
 */
import type cytoscape from 'cytoscape';
import { cullLabels, labelAbove, labelBelow } from '../graph-style';
import type { MapParts } from './context';

/** Below this zoom only hubs keep a (larger) label. */
export const FAR_ZOOM = 0.9;
/** Labels smaller than this on screen are not drawn. */
const MIN_LABEL_PX = 8;
const HOVER_LABEL_PX = 11;

export type LabelWidth = (n: cytoscape.NodeSingular, px: number) => number;

/** Text widths measured on a canvas in the map's font, cached per term and size. */
export function createMeasure(terms: cytoscape.NodeCollection) {
  const measure = document.createElement('canvas').getContext('2d')!;
  const family = terms.first().style('font-family') as string;
  const textWidth = (text: string, px: number, weight = 'normal') => {
    measure.font = `${weight} ${px}px ${family}`;
    return measure.measureText(text).width;
  };
  const cache = new Map<string, number>();
  const labelWidth: LabelWidth = (n, px) => {
    const key = `${n.id()}\u0000${px}\u0000${n.data('label')}`;
    if (!cache.has(key)) cache.set(key, textWidth(n.data('label'), px));
    return cache.get(key)!;
  };
  return { textWidth, labelWidth };
}

type Measure = ReturnType<typeof createMeasure>;

/** Boxes of the island names written above their islands (labels give way to them). */
const nameBoxes = (cy: cytoscape.Core, m: Measure) =>
  (
    cy
      .nodes('.tag')
      .not('.gone')
      .filter((t) => t.data('valign') === 'top') as cytoscape.NodeCollection
  ).map((t) =>
    labelAbove(t.position(), m.textWidth(t.data('label'), t.data('font'), '600'), t.data('font')),
  );

/** Zoomed out, a lit term's label keeps a constant size on screen. */
function syncHoverFont(terms: cytoscape.NodeCollection, zoom: number) {
  const hoverFont = Math.max(9, Math.round(HOVER_LABEL_PX / zoom));
  if (terms.first().data('hoverFont') !== hoverFont) terms.data('hoverFont', hoverFont);
}

/** Bigger terms first; ties in id order, so the cull is stable. */
const bySizeThenId = (a: cytoscape.NodeSingular, b: cytoscape.NodeSingular) =>
  b.data('size') - a.data('size') || (a.id() < b.id() ? -1 : 1);

/** Hide the labels that are too small or would overlap (bigger terms win). */
function cull(p: MapParts, m: Measure) {
  const zoom = p.cy.zoom();
  const far = zoom < FAR_ZOOM;
  if (far) syncHoverFont(p.terms, zoom);
  const fontOf = (n: cytoscape.NodeSingular): number => (far ? n.data('farFont') : n.data('font'));
  const shown = p.terms.not('.gone') as cytoscape.NodeCollection;
  const candidates = shown
    .filter((n) => fontOf(n) > 0 && fontOf(n) * zoom >= MIN_LABEL_PX)
    .sort(bySizeThenId) as cytoscape.NodeCollection;
  const below = (n: cytoscape.NodeSingular) =>
    labelBelow(n.position(), n.data('size'), m.labelWidth(n, fontOf(n)), fontOf(n));
  const hidden = cullLabels(
    candidates.map((n) => ({ id: n.id(), ...below(n) })),
    nameBoxes(p.cy, m),
  );
  p.cy.batch(() => {
    p.terms.removeClass('nolabel');
    shown.filter((n) => hidden.has(n.id()) || !candidates.contains(n)).addClass('nolabel');
  });
}

/**
 * Keep labels culled for the zoom: `recull` re-runs the cull once the zoom settles in a
 * new step (or at once with `force`), and the near/far switch follows every zoom.
 */
export function createLabelCull(p: MapParts) {
  const { bundleEdges } = p;
  const m = createMeasure(p.terms);
  let cullAt = NaN;
  let timer = 0;
  const recull = (force = false) => {
    const z = p.cy.zoom();
    const key = z < FAR_ZOOM ? -Math.floor(z * 20) : Math.floor(z * 20);
    if (key === cullAt && !force) return;
    cullAt = key;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => cull(p, m), 120);
  };
  const setFar = () => {
    const far = p.cy.zoom() < FAR_ZOOM;
    if (far !== p.terms.first().hasClass('far')) p.terms.toggleClass('far', far);
    // Bundles are an overview device: zoomed in, the real edges take over.
    if (far === bundleEdges.first().hasClass('near')) bundleEdges.toggleClass('near', !far);
    // Everything else waits until the zoom settles (see `cull`): restyling mid-gesture
    // would throw away the viewport snapshot.
    recull();
  };
  p.cy.on('zoom viewport', setFar);
  return { recull, labelWidth: m.labelWidth, stop: () => window.clearTimeout(timer) };
}
