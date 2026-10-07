/**
 * The Explorer's 2D map: one Cytoscape instance for the life of the page.
 * The island layout is computed once from the whole graph; filters only hide and show
 * elements in place, layouts (force / depth / time) and the lab's relayout glide nodes
 * to new positions, and nothing here ever re-creates the instance. Browser-only.
 *
 * This module composes the map's parts (`explorer-2d/`): elements and style, islands and
 * placement, label culling, edges and their reveal, hover and relationship names, the
 * pointer, the camera and the palette. They share `MapParts` and a small `MapState`.
 */
import cytoscape from 'cytoscape';
import { EXPLORER } from './explorer-config';
import { MAP_INK, type MapTheme } from './graph-style';
import type { Axes } from './explorer-keys';
import { startDots, type DotsConfig } from './explorer-flow';
import { createApply } from './explorer-2d/apply';
import { centreOn, nudge } from './explorer-2d/camera';
import type { MapParts, MapState } from './explorer-2d/context';
import { createEdges, createRoutes } from './explorer-2d/edges';
import { anchorElements, bundleElements, mapElements } from './explorer-2d/elements';
import { bindClusterFocus } from './explorer-2d/cluster-focus';
import { createHover, crowdedLabels } from './explorer-2d/hover';
import { buildIslands, type IslandTune } from './explorer-2d/islands';
import { createLabelCull, type LabelWidth } from './explorer-2d/labels';
import { createLayouts, createPlacement } from './explorer-2d/placement';
import { bindPointer } from './explorer-2d/pointer';
import { createRelationNames } from './explorer-2d/relation-names';
import { createStagger } from './explorer-2d/stagger';
import { mapStylesheet } from './explorer-2d/style';
import { retheme } from './explorer-2d/theme';
import type { Map2DOptions } from './explorer-2d/types';

export type { Layout, Map2DOptions, View } from './explorer-2d/types';

const createCy = (opts: Map2DOptions, theme: MapTheme) =>
  cytoscape({
    container: opts.container,
    elements: mapElements(opts.graph, opts.lang, theme),
    style: mapStylesheet(theme, opts.variant),
    layout: { name: 'preset', fit: false } as cytoscape.LayoutOptions,
    minZoom: 0.08,
    maxZoom: 3,
    autoungrabify: true,
    boxSelectionEnabled: false,
    // Pan and zoom move a snapshot of the map; it is redrawn crisp when they stop.
    textureOnViewport: true,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
  });

/** The instance, its islands laid out once, then the island anchors and bundles. */
function createParts(opts: Map2DOptions, theme: MapTheme) {
  const { graph } = opts;
  const cy = createCy(opts, theme);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const clusterOf = (id: string) => byId.get(id)?.cluster;
  const terms = cy.nodes('[size]');
  // v2 names no term at rest, from the first frame (the cull only runs once zoom settles).
  if (opts.variant === 'v2') terms.addClass('nolabel');
  const links = cy.edges().not('.bundle');
  const layouts = createLayouts({ graph, clusterOf, opts }, buildIslands(cy, graph.nodes));
  cy.add(anchorElements(layouts.islands.clusterIds, layouts.force.centre));
  cy.add(bundleElements(graph, byId, theme));
  const bundleEdges = cy.edges('.bundle');
  const p: MapParts = { cy, opts, graph, byId, clusterOf, terms, links, bundleEdges };
  return { p, layouts };
}

/** The flow dots, paused while terms glide; the lab tunes a copy and can pause them. */
function startMapDots(p: MapParts, s: MapState) {
  const cfg: { -readonly [K in keyof DotsConfig]: number } = { ...EXPLORER.dots };
  let on = true;
  const paused = () => s.moving || !on;
  const dots = startDots(p.cy, p.links, paused, () => MAP_INK[s.theme].dotAlpha, cfg);
  return { cfg, dots, setOn: (v: boolean) => void (on = v) };
}

const initialState = (p: MapParts, theme: MapTheme, centre: MapState['centreNow']): MapState => ({
  theme,
  view: null,
  hovered: null,
  shown: p.cy.collection(),
  moving: false,
  centreNow: centre,
});

/** v2 only: a selection's crowded neighbour names, and the cluster names' hover and click. */
function v2Parts(p: MapParts, s: MapState, labelWidth: LabelWidth) {
  if (p.opts.variant !== 'v2') return { crowd: undefined, clusters: () => {} };
  const crowd = (lit: cytoscape.NodeCollection) => crowdedLabels(p, lit, labelWidth);
  return { crowd, clusters: bindClusterFocus(p, s, crowd) };
}

/** Every part of the map, wired together. */
function assemble(opts: Map2DOptions) {
  const theme = opts.theme ?? 'dark';
  const { p, layouts } = createParts(opts, theme);
  const labels = createLabelCull(p);
  const s = initialState(p, theme, layouts.force.centre);
  const refreshEdges = createEdges(p, s);
  const routes = createRoutes(p);
  const names = createRelationNames(p, s);
  const hover = createHover(p, s, { paintNames: names.paint, labelWidth: labels.labelWidth });
  const pointer = bindPointer(p, s, { hover, names });
  const dots = startMapDots(p, s);
  const deps = { routes, recull: labels.recull, paintNames: names.paint, moved: pointer.moved };
  const { crowd, clusters } = v2Parts(p, s, labels.labelWidth);
  const place = createPlacement(p, s, layouts, deps);
  const stagger = createStagger(p.cy);
  const apply = createApply(p, s, { ...deps, refreshEdges, stagger, place, hover, crowd });
  return { p, s, layouts, labels, hover, pointer, dots, place, stagger, apply, clusters };
}

type Assembled = ReturnType<typeof assemble>;

/** Hooks for the hidden visual lab only; the Explorer never uses them. */
const labHooks = (m: Assembled) => ({
  dots: m.dots.cfg,
  setDots(on: boolean) {
    m.dots.setOn(on);
  },
  /** Re-space the island map (see `shapeIslands`) and glide the terms there. */
  relayout(tune: IslandTune) {
    m.layouts.respace(tune);
    if (m.s.view) m.place(m.s.view, true);
  },
});

const destroyer = (m: Assembled) => () => {
  m.dots.dots.stop();
  m.stagger.cancel();
  m.labels.stop();
  m.hover.stop();
  m.clusters();
  m.pointer.destroy();
  m.p.cy.destroy();
};

export function createMap2D(opts: Map2DOptions) {
  const m = assemble(opts);
  const { p, s } = m;
  return {
    cy: p.cy,
    apply: m.apply,
    /** Switch palettes in place; see `explorer-2d/theme.ts`. */
    retheme(next: MapTheme) {
      if (next === s.theme) return;
      s.theme = next;
      retheme(p, next);
    },
    /** Bring a term into view (Find a term, even when it is already selected). */
    focus: (id: string) => void centreOn(p, id, [0.9, 1.2]),
    /** Keyboard navigation: pan and zoom about the clear part's centre, for dt s. */
    nudge: (v: Axes, dt: number) => nudge(p, v, dt),
    resize() {
      p.cy.resize();
      m.dots.dots.resize();
    },
    lab: labHooks(m),
    destroy: destroyer(m),
  };
}

export type Map2D = ReturnType<typeof createMap2D>;
