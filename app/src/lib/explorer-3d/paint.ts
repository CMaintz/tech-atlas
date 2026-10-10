/**
 * Everything the 3D map draws itself, beside 3d-force-graph's spheres and lit links:
 * glow, hub labels, domain names, the resting web, the comets and the relationship
 * names — built in draw order, painted together, and switched between palettes.
 */
import { EXPLORER } from '../explorer-config';
import { endId } from './model';
import { bend, curveLengths, packCurves } from './curves';
import { createGlow } from './glow';
import { createDomainNames, createHubLabels } from './labels';
import { createWeb } from './web';
import { createFlow } from './flow';
import { createTags } from './tags';
import { createTermNames } from './term-names';
import { createClusterNames } from './clusters';
import type { Ctx } from './context';
import { inkOf, isLight } from './lens';

/** Each link's curve, packed (shared by the web, comets and names), and its length. */
function curvesOf({ model }: Ctx) {
  const ends = (id: unknown) => model.byId.get(endId(id))!;
  const { curve, segments } = packCurves(
    model.links.map((l) => bend(ends(l.source), ends(l.target))),
  );
  return { curve, segments, linkLength: curveLengths(curve, model.links.length) };
}

function createParts(ctx: Ctx) {
  const glow = createGlow(ctx);
  const hubs = createHubLabels(ctx);
  const domains = createDomainNames(ctx);
  const { curve, segments, linkLength } = curvesOf(ctx);
  const web = createWeb(ctx, segments);
  const flow = createFlow(ctx, curve, linkLength);
  flow.run(true);
  const tags = createTags(ctx, curve);
  // v2 only (both are empty otherwise): lit terms' names, and the cluster names.
  const termNames = createTermNames(ctx);
  const clusters = createClusterNames(ctx);
  return { glow, hubs, domains, web, flow, tags, termNames, clusters, curve, linkLength };
}

type Parts = ReturnType<typeof createParts>;

/** Additive on the night map; multiplied into the cream map (a light on white is lost). */
function setBlend(ctx: Ctx, { glow, flow, web }: Parts) {
  const light = isLight(ctx);
  const blending = light ? ctx.THREE.MultiplyBlending : ctx.THREE.AdditiveBlending;
  for (const m of [glow.material, flow.material, web.web.material]) {
    m.blending = blending;
    m.needsUpdate = true;
  }
  glow.material.uniforms.light.value = +light;
  flow.material.uniforms.light.value = +light;
  glow.material.uniforms.opacity.value = EXPLORER.three.glowOpacity * (light ? 0.7 : 1);
}

/** Background, fog, blending, colours and every drawn text, for the current palette. */
function repalette(ctx: Ctx, parts: Parts) {
  setBlend(ctx, parts);
  ctx.fg.backgroundColor(inkOf(ctx).bg3d);
  ctx.scene.fog?.color.set(inkOf(ctx).bg3d);
  parts.web.retint();
  parts.flow.recolour();
  parts.tags.clearArt();
  parts.hubs.redraw();
  parts.domains.redraw();
  parts.termNames.clearArt();
  parts.clusters.redraw();
}

export function createPainter(ctx: Ctx) {
  const parts = createParts(ctx);
  setBlend(ctx, parts);
  /** Paint all of ours; `stagger` reveals newly shown links a batch per frame. */
  const paint = (stagger = false) => {
    parts.web.paint(stagger);
    parts.flow.paint();
    parts.glow.paint();
    parts.hubs.paint();
    parts.domains.paint();
    parts.tags.paint();
    parts.termNames.paint();
    parts.clusters.paint();
  };
  /** Re-evaluate 3d-force-graph's accessors (its idiom), paint ours, land new objects. */
  const refresh = () => {
    const { fg } = ctx;
    fg.nodeColor(fg.nodeColor())
      .linkVisibility(fg.linkVisibility())
      .linkColor(fg.linkColor())
      .linkDirectionalArrowLength(fg.linkDirectionalArrowLength())
      .linkDirectionalParticles(fg.linkDirectionalParticles());
    paint();
    // New objects start at the origin until the (fixed-node) engine runs one tick.
    fg.d3ReheatSimulation();
  };
  return { ...parts, paint, refresh, repalette: () => repalette(ctx, parts) };
}

export type Painter = ReturnType<typeof createPainter>;
