/**
 * The visual lab's (A96) 2D side: per-edge data the lab rules read, the lab stylesheet
 * over the Explorer's own, flow and hover variants, and the lab-only relayout.
 */
import { useEffect, useRef, type MutableRef } from 'preact/hooks';
import type cytoscape from 'cytoscape';
import type { Graph } from '../../lib/graph-model';
import { EXPLORER } from '../../lib/explorer-config';
import { attachHover } from '../../lib/graph-cytoscape';
import { domainColour, homeDomain, type MapTheme } from '../../lib/graph-style';
import {
  alphaGain,
  emphasise,
  importance,
  intensity,
  widthGain,
  type Lab2D,
} from '../../lib/explorer-lab';
import { labStylesheet } from './style-2d';
import type { Maps } from './use-visual-lab';

/**
 * Sub-domain clustering in 2D: islands shrink to `tight` × and sit `gap` px further apart.
 */
const SUB_2D = { tight: 0.8, gap: 70 };

/** Everything the 2D lab does to the Explorer's 2D map. */
export function useLab2D(
  maps: Maps,
  graph: Graph | null,
  s2: Lab2D,
  view: '2d' | '3d',
  theme: MapTheme,
) {
  const cy = maps.map2d?.cy;
  const base = useRef<unknown[] | null>(null);
  useEdgeData(cy, graph, theme, base);
  useEmphasisData(cy, graph, s2, theme);
  useLabStyle(maps, cy, base, graph, s2, view, theme);
  useRelayout(maps, s2);
  useOldHover(cy, s2.hover);
  useOldDashes(cy, s2.flow, s2.speed);
}

/** The base stylesheet (re-read after a retheme), each edge's gradient and its curve. */
function useEdgeData(
  cy: cytoscape.Core | undefined,
  graph: Graph | null,
  theme: MapTheme,
  base: MutableRef<unknown[] | null>,
) {
  useEffect(() => {
    if (!cy || !graph) return;
    base.current = (cy.style() as unknown as { json(): unknown[] }).json();
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    const colour = (id: string) => {
      const n = byId.get(id);
      return n ? domainColour(homeDomain(n), theme) : '#888888';
    };
    const gradient = (e: cytoscape.EdgeSingular) =>
      `${colour(e.data('source'))} ${colour(e.data('target'))}`;
    forLabEdges(cy, (e) => {
      e.data('labGradient', gradient(e));
      e.data('labCurve', e.data('curve'));
    });
  }, [cy, graph, theme]);
}

/** Every edge but the bundles, in one batch. */
function forLabEdges(cy: cytoscape.Core, fn: (e: cytoscape.EdgeSingular) => void) {
  cy.batch(() => cy.edges().not('.bundle').forEach(fn));
}

/** Emphasis by importance: each edge's opacity, colour and width as data the rules read. */
function useEmphasisData(
  cy: cytoscape.Core | undefined,
  graph: Graph | null,
  s2: Lab2D,
  theme: MapTheme,
) {
  useEffect(() => {
    if (!cy || !graph || s2.emph === 'off') return;
    const imp = importance(graph.links);
    forLabEdges(cy, (e) => {
      const k = intensity(imp[Number(e.id().slice(1))] ?? 0, s2.spread);
      e.data(emphasisData(e, k, theme === 'light'));
    });
  }, [cy, graph, s2.emph, s2.spread, theme]);
}

/** An edge's emphasised opacities (per edge class), width and colours at intensity k. */
function emphasisData(e: cytoscape.EdgeSingular, k: number, light: boolean) {
  const { restAlpha, crossAlpha, allAlpha } = EXPLORER.edges;
  const a = alphaGain(k);
  return {
    labAlpha: Math.min(1, restAlpha * a),
    labAlphaXc: Math.min(1, crossAlpha * a),
    labAlphaAll: Math.min(1, allAlpha * a),
    labWidth: Number(e.data('width')) * widthGain(k),
    labTint: emphasise(String(e.data('tint')), k, light),
    labColour: emphasise(String(e.data('colour')), k, light),
  };
}

/** The lab stylesheet over the base, the dots' flow and speed, and snapshot panning. */
function useLabStyle(
  maps: Maps,
  cy: cytoscape.Core | undefined,
  base: MutableRef<unknown[] | null>,
  graph: Graph | null,
  s2: Lab2D,
  view: '2d' | '3d',
  theme: MapTheme,
) {
  useEffect(() => {
    const m = maps.map2d;
    if (!m || !cy || !base.current || view !== '2d') return;
    forLabEdges(cy, (e) => void e.data('labCurve', Number(e.data('curve')) * s2.strength));
    cy.style()
      .fromJson(labStylesheet(base.current, s2, theme))
      .update();
    m.lab.setDots(s2.flow === 'dots');
    m.lab.dots.speed = EXPLORER.dots.speed * s2.speed;
    (cy as unknown as { renderer(): { textureOnViewport: boolean } }).renderer().textureOnViewport =
      s2.texture;
  }, [maps, cy, graph, s2, view, theme]);
}

/** Relayout (lab only): minimum distance and sub-domain clustering re-space the islands. */
function useRelayout(maps: Maps, s2: Lab2D) {
  const laid = useRef('1|false');
  useEffect(() => {
    const m = maps.map2d;
    const key = `${s2.mindist}|${s2.sub}`;
    if (!m || key === laid.current) return;
    laid.current = key;
    m.lab.relayout({
      spacing: s2.mindist,
      tight: s2.sub ? SUB_2D.tight : 1,
      gap: s2.sub ? SUB_2D.gap : 0,
    });
  }, [maps, s2.mindist, s2.sub]);
}

/** The old hover: every element restyled on each hover (graph-cytoscape `attachHover`). */
function useOldHover(cy: cytoscape.Core | undefined, hover: Lab2D['hover']) {
  useEffect(() => {
    if (!cy || hover !== 'old') return;
    attachHover(cy);
    return () => {
      cy.removeListener('mouseover', 'node:childless');
      cy.removeListener('mouseout', 'node:childless');
      cy.elements().removeClass('hflow');
    };
  }, [cy, hover]);
}

/** The old flow: every visible one-way edge dashed, the dash offset restyled each tick. */
function useOldDashes(cy: cytoscape.Core | undefined, flow: Lab2D['flow'], speed: number) {
  useEffect(() => {
    if (!cy || flow !== 'dashes') return;
    const directed = cy.edges('[?directed]').not('.bundle');
    directed.addClass('labflow');
    const stop = everyFlowTick((now) => {
      const { dash } = EXPLORER.flow;
      const offset = -(((now / 1000) * EXPLORER.flow.speed * speed) % (dash[0] + dash[1]));
      directed.not('.off').style('line-dash-offset', offset);
    });
    return () => {
      stop();
      directed.removeClass('labflow').removeStyle('line-dash-offset');
    };
  }, [cy, flow, speed]);
}

/** Call `fn` on animation frames at most EXPLORER.flow.fps times a second; returns stop. */
function everyFlowTick(fn: (now: number) => void) {
  let raf = 0;
  let last = 0;
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    if (now - last < 1000 / EXPLORER.flow.fps) return;
    last = now;
    fn(now);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
