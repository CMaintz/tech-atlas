/**
 * Where terms sit: the island map (force) and the depth and time lanes, each
 * computed once from the whole graph (lanes on first use) and never changed by filters;
 * `place` puts the terms, anchors and tags of a layout there, gliding on a switch.
 */
import type cytoscape from 'cytoscape';
import { EXPLORER } from '../explorer-config';
import { LAYOUT_SEED, withSeededRandom, type Point } from '../graph-style';
import { depthLanes, timeLanes, type LaneLayout } from '../graph-layout';
import { reducedMotion } from '../graph-cytoscape';
import { frame } from './camera';
import type { MapParts, MapState } from './context';
import type { SetRoutes } from './edges';
import { islandMap, shapeIslands, type IslandGeometry, type IslandTune } from './islands';
import { tagHidden, tagsFor } from './tags';
import type { View } from './types';

/** The depth and time lanes, each computed on first use and kept. */
function laneCache(graph: MapParts['graph']) {
  const lanes = new Map<'depth' | 'time', LaneLayout>();
  return (layout: 'depth' | 'time') => {
    if (!lanes.has(layout))
      lanes.set(
        layout,
        layout === 'depth' ? depthLanes(graph.nodes, graph.links) : timeLanes(graph.nodes),
      );
    return lanes.get(layout)!;
  };
}

/** The whole-graph layouts: the island map now, depth and time lanes when first used. */
export function createLayouts(
  p: Pick<MapParts, 'graph' | 'clusterOf' | 'opts'>,
  islands: IslandGeometry,
) {
  const everyone = new Set(p.graph.nodes.map((n) => n.id));
  const graph = { links: p.graph.links, clusterOf: p.clusterOf };
  const wide = () => p.opts.container.clientWidth >= p.opts.container.clientHeight;
  const forceMap = () => islandMap(islands, graph, everyone, wide());
  const layouts = {
    islands,
    force: forceMap(),
    lanes: laneCache(p.graph),
    /** Re-space the island map (the lab). */
    respace(tune: IslandTune) {
      withSeededRandom(LAYOUT_SEED, () => shapeIslands(islands, tune));
      layouts.force = forceMap();
    },
  };
  return layouts;
}

export type Layouts = ReturnType<typeof createLayouts>;

type PlaceDeps = {
  routes: SetRoutes;
  recull: (force?: boolean) => void;
  paintNames: () => void;
  moved: () => void;
};

/** A view's term positions, tags and island centres (force only). */
function targetFor(p: MapParts, s: MapState, layouts: Layouts, v: View) {
  const m = v.layout === 'force' ? layouts.force : layouts.lanes(v.layout);
  const tags = tagsFor(v.layout, m, layouts.islands.sizeOf, p.opts, s.theme);
  const centre = v.layout === 'force' ? layouts.force.centre : undefined;
  return { positions: m.positions, tags, centre };
}

const setTags = (p: MapParts, defs: cytoscape.ElementDefinition[]) =>
  p.cy.batch(() => {
    p.cy.nodes('.tag').remove();
    p.cy.add(defs.map((d) => ({ ...d, group: 'nodes' as const })));
  });

/** Names of disabled domains, and of clusters with nothing left of their own, hide. */
export const refreshTags = (p: MapParts, v: View) =>
  p.cy.batch(() =>
    p.cy
      .nodes('.tag')
      .forEach((tag) => void tag.toggleClass('gone', tagHidden(tag.id(), v, p.graph.nodes))),
  );

const moveAnchors = (p: MapParts, clusterIds: string[], centre: Record<string, Point>) =>
  p.cy.batch(() =>
    clusterIds.forEach((c) => centre[c] && p.cy.getElementById(`anc:${c}`).position(centre[c])),
  );

/** Glide terms to their new positions; `done` once they land. */
const glide = (
  move: cytoscape.NodeCollection,
  positions: Record<string, Point>,
  done: () => void,
) =>
  move
    .layout({
      name: 'preset',
      positions: (n: cytoscape.NodeSingular) => positions[n.id()],
      animate: true,
      animationDuration: EXPLORER.motion.layoutMs,
      animationEasing: 'ease-in-out-cubic',
      fit: false,
    } as cytoscape.LayoutOptions)
    .one('layoutstop', done)
    .run();

/** Terms are in place: routes back, labels culled, the view framed, names placed. */
function landed(
  p: MapParts,
  s: MapState,
  deps: PlaceDeps,
  v: View,
  centre?: Record<string, Point>,
) {
  s.moving = false;
  deps.routes(v.layout === 'force' && v.showAll, centre);
  deps.recull(true);
  frame(p, s);
  deps.paintNames();
}

/** Put a view's layout in place: at once, or gliding (not under reduced motion). */
export function createPlacement(p: MapParts, s: MapState, layouts: Layouts, deps: PlaceDeps) {
  return (v: View, animate: boolean) => {
    const t = targetFor(p, s, layouts, v);
    s.centreNow = t.centre;
    setTags(p, t.tags);
    refreshTags(p, v);
    if (t.centre) moveAnchors(p, layouts.islands.clusterIds, t.centre);
    const move = p.terms.filter((n) => !!t.positions[n.id()]);
    const done = () => landed(p, s, deps, v, t.centre);
    if (!animate || reducedMotion()) {
      p.cy.batch(() => move.forEach((n) => void n.position(t.positions[n.id()])));
      return done();
    }
    // Straight-line routes bend badly mid-flight; drop them until nodes land.
    deps.routes(false);
    s.moving = true;
    deps.moved();
    glide(move, t.positions, done);
  };
}

export type Place = ReturnType<typeof createPlacement>;
