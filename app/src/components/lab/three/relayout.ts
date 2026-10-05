/**
 * Relayout (visual lab only): sub-domain clusters (each cluster pulled out from its
 * domain's centre and drawn in) and a minimum distance between terms, always from the
 * original layout; the glow, sprites, hub labels, curves and cluster names follow.
 */
import { EXPLORER } from '../../../lib/explorer-config';
import { separate } from '../../../lib/graph-layout';
import { homeDomain } from '../../../lib/graph-style';
import { subClusters, type Vec } from '../../../lib/explorer-lab/geometry';
import type { Lab3D } from '../../../lib/explorer-lab';
import type { Lab3, NodeLike } from './context';
import { measureLinks, type Bender } from './curves';
import type { GlowSprites } from './sprites';
import type { ClusterNames } from './cluster-names';

/** 3D clusters move `spread` × away from their domain's centre and shrink to `tight` ×. */
const SUB_3D = { spread: 1.4, tight: 0.7 };

type Parts = {
  bender: Bender;
  sprites: GlowSprites;
  names: ClusterNames;
  byCluster: Map<string, number[]>;
  byDomain: Map<string, number[]>;
};

export function createRelayout(ctx: Lab3, parts: Parts) {
  const orig = ctx.nodes.map((n) => ({ x: n.x, y: n.y, z: n.z }));
  let laid = '1|false';
  /** Re-space for `s` (a no-op if unchanged); curves re-bend by `curvature`. */
  return (s: Lab3D, curvature: number) => {
    const key = `${s.mindist}|${s.sub}`;
    if (key === laid) return;
    laid = key;
    const ps = orig.map((p) => ({ ...p }));
    const domainOf = (i: number) => homeDomain(ctx.nodes[i]);
    if (s.sub) subClusters(ps, orig, parts.byCluster, parts.byDomain, domainOf, SUB_3D);
    if (s.mindist !== 1 || s.sub) spaceTerms(ctx, ps, s.mindist);
    moveTerms(ctx, ps, parts.sprites);
    placeHubLabels(ctx);
    parts.bender.rebend(curvature);
    measureLinks(ctx);
    parts.names.place();
    ctx.fg.d3ReheatSimulation();
  };
}

/** A term's radius, as explorer-3d sizes it. */
const radiusOf = (ctx: Lab3, n: NodeLike) =>
  ctx.L.radius(n as unknown as Parameters<Lab3['L']['radius']>[0]);

/** No two terms closer than `mindist` × today's spacing (a click target and a label). */
function spaceTerms(ctx: Lab3, ps: Vec[], mindist: number) {
  const r = ctx.nodes.map((n) => radiusOf(ctx, n));
  const { factor } = EXPLORER.spacing;
  separate(ps, (i, j) => mindist * ((factor * (r[i] + r[j])) / 2 + ctx.cfg.labelClearance), 60);
}

/** Pin every term at its new place and move its glow point and sprite with it. */
function moveTerms(ctx: Lab3, ps: Vec[], sprites: GlowSprites) {
  const glowPos = ctx.L.glow.geometry.getAttribute('position');
  ctx.nodes.forEach((n, i) => {
    const p = ps[i];
    Object.assign(n, { x: p.x, y: p.y, z: p.z, fx: p.x, fy: p.y, fz: p.z });
    glowPos.setXYZ(i, p.x, p.y, p.z);
  });
  sprites.each((sp, i) => sp.position.set(ps[i].x, ps[i].y, ps[i].z));
  glowPos.needsUpdate = true;
}

/** Hub labels sit just above their term. */
function placeHubLabels(ctx: Lab3) {
  const hubH = ctx.cfg.hubLabelHeight;
  for (const [id, sprite] of ctx.L.labels) {
    const n = ctx.byId.get(id);
    if (n) sprite.position.set(n.x, n.y + radiusOf(ctx, n) + hubH * 0.7, n.z);
  }
}
