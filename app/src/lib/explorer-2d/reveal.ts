/**
 * Edges switched on or off by a view change: relationship families fade out
 * rather than blink; many changed edges (types, "show all") change a batch per frame and
 * a few fade in at once; all instant under reduced motion. Bundled routes follow.
 */
import type cytoscape from 'cytoscape';
import { EXPLORER } from '../explorer-config';
import { reducedMotion } from '../graph-cytoscape';
import { linkOf, reshow, type MapParts, type MapState } from './context';
import { applyEdge, type EdgeChange, type SetRoutes } from './edges';
import type { Stagger } from './stagger';
import type { View } from './types';

export type RevealDeps = {
  refreshEdges: (defer?: boolean) => EdgeChange[];
  routes: SetRoutes;
  stagger: Stagger;
  paintFocus: () => void;
};
/** What the change asks of routes: redo them (`routes`), and whether they are on. */
type Routing = { routes: boolean; bundle: boolean };

const edgesOf = (p: MapParts, cs: EdgeChange[]) =>
  p.cy.collection(cs.map((c) => c.e)) as cytoscape.EdgeCollection;

/** Edges of families just switched off that fade out first (not the selection's own). */
export function fadingEdges(p: MapParts, was: ReadonlySet<string> | null, next: View) {
  if (!was || was === next.families || reducedMotion()) return p.cy.collection();
  return p.links.filter((e) => {
    const f = linkOf(p, e).family;
    const mine = e.data('source') === next.selected || e.data('target') === next.selected;
    return was.has(f) && !next.families.has(f) && !e.hasClass('off') && !mine;
  });
}

export const fadeOut = (edges: cytoscape.Collection, then: () => void) =>
  edges.animate(
    { style: { opacity: 0 } },
    {
      duration: EXPLORER.motion.fadeMs,
      complete: () => {
        edges.removeStyle('opacity');
        then();
      },
    },
  );

const fadeIn = (edges: cytoscape.EdgeCollection) =>
  edges.forEach((e) => {
    const target = Number(e.style('opacity'));
    e.style('opacity', 0).animate(
      { style: { opacity: target } },
      { duration: EXPLORER.motion.fadeMs, complete: () => void e.removeStyle('opacity') },
    );
  });

/** Apply changes; the edges they switch on get bundled routes when those are on. */
function land(p: MapParts, s: MapState, d: RevealDeps, cs: EdgeChange[], r: Routing) {
  const arriving = edgesOf(
    p,
    cs.filter((c) => c.on && c.e.hasClass('off')),
  );
  cs.forEach(applyEdge);
  if (r.bundle && !r.routes) d.routes(true, s.centreNow, arriving);
  return arriving;
}

/** Many changes: a batch per frame, routes now for the edges that stay shown. */
function revealInBatches(p: MapParts, s: MapState, d: RevealDeps, cs: EdgeChange[], r: Routing) {
  const changing = edgesOf(p, cs);
  if (r.routes)
    d.routes(r.bundle, s.centreNow, (r.bundle ? p.links.not('.off') : p.links).not(changing));
  const step = (chunk: EdgeChange[]) => {
    land(p, s, d, chunk, r);
    if (r.routes) d.routes(r.bundle, s.centreNow, edgesOf(p, chunk));
  };
  d.stagger.run(cs, step, () => {
    reshow(p, s);
    d.paintFocus();
  });
}

/** A small change (or reduced motion): at once, new edges fading in. */
function revealAtOnce(
  p: MapParts,
  s: MapState,
  d: RevealDeps,
  cs: EdgeChange[],
  r: Routing,
  fade: boolean,
) {
  let arriving = p.cy.collection() as cytoscape.EdgeCollection;
  p.cy.batch(() => void (arriving = land(p, s, d, cs, r)));
  reshow(p, s);
  if (r.routes) d.routes(r.bundle, s.centreNow);
  if (fade) fadeIn(arriving);
}

/** Routes are redone when "show all" or the layout changes; on for "show all" in force. */
const routingOf = (prev: View | null, next: View, layoutChanged: boolean): Routing => ({
  routes: prev?.showAll !== next.showAll || layoutChanged,
  bundle: next.layout === 'force' && next.showAll,
});

/** Restyle the edges for a new view (`prev` the one before), then paint its focus. */
export function revealEdges(
  p: MapParts,
  s: MapState,
  d: RevealDeps,
  prev: View | null,
  next: View,
) {
  const layoutChanged = !prev || prev.layout !== next.layout;
  // Many edges switched on or off by a toggle (types, "show all") change a batch per frame.
  const toggled = prev && (prev.families !== next.families || prev.showAll !== next.showAll);
  const stagger = !!toggled && !layoutChanged && !reducedMotion();
  const r = routingOf(prev, next, layoutChanged);
  const changes = d.refreshEdges(stagger);
  if (changes.length > EXPLORER.motion.revealBatch) revealInBatches(p, s, d, changes, r);
  else revealAtOnce(p, s, d, changes, r, stagger);
  d.paintFocus();
}
