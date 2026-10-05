/**
 * The 2D map's camera: fit what is shown, centre a term in the part of the map the docked
 * panel leaves visible, frame a layout, and keyboard pan and zoom.
 */
import { EXPLORER } from '../explorer-config';
import { reducedMotion, smoothFit } from '../graph-cytoscape';
import type { Axes } from '../explorer-keys';
import type { MapParts, MapState } from './context';

/** Fit the shown terms and names, clear of the open legend. */
function fit(p: MapParts, s: MapState) {
  p.cy.stop(true);
  const eles = s.shown.nodes().union(p.cy.nodes('.tag').not('.gone'));
  smoothFit(p.cy, 24, 1.1, p.opts.reserveRight(), eles);
}

/** Centre a term in the part of the map the docked panel leaves visible. */
export function centreOn(p: MapParts, id: string, zoomRange: [number, number] = [0, Infinity]) {
  const { cy } = p;
  const node = cy.getElementById(id);
  if (node.empty() || node.hasClass('gone')) return false;
  cy.stop(true);
  const zoom = Math.min(zoomRange[1], Math.max(cy.zoom(), zoomRange[0]));
  const at = node.position();
  const clear = cy.width() - p.opts.centreReserve();
  cy.animate(
    { zoom, pan: { x: clear / 2 - at.x * zoom, y: cy.height() / 2 - at.y * zoom } },
    { duration: reducedMotion() ? 0 : 400, easing: 'ease-in-out-cubic' },
  );
  return true;
}

/**
 * Frame the view after a layout: an explicit selection wins over the fit (a deep link
 * must land centred on its term); a small neighbourhood is fitted whole.
 */
export function frame(p: MapParts, s: MapState) {
  const sel = s.view?.selected;
  if (sel && s.shown.nodes('[size]').length > EXPLORER.islands.minTermsForSystems) {
    if (centreOn(p, sel, [0.9, 1.2])) return;
  }
  fit(p, s);
}

/** Keyboard navigation: pan and zoom about the clear part's centre, for dt s. */
export function nudge(p: MapParts, v: Axes, dt: number) {
  const { cy } = p;
  const k = EXPLORER.keys;
  cy.stop(true);
  if (v.x || v.y) cy.panBy({ x: -v.x * k.panPx * dt, y: -v.y * k.panPx * dt });
  if (v.zoom)
    cy.zoom({
      level: cy.zoom() * Math.exp(v.zoom * k.zoomRate * dt),
      renderedPosition: { x: (cy.width() - p.opts.centreReserve()) / 2, y: cy.height() / 2 },
    });
}
