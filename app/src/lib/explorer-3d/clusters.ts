import { EXPLORER } from '../explorer-config';
import { clusterColour, homeDomain } from '../graph-style';
import type { Ctx } from './context';
import { cameraOf } from './graph3d';
import { domainCanvas, drawDomain, textSprite } from './text-art';
import type { CanvasTexture, Node3, Sprite } from './types';

export type ClusterGroup = {
  cluster: string;
  domain: string;
  ids: ReadonlySet<string>;
  members: readonly Node3[];
  central: string[];
  x: number;
  z: number;
  top: number;
};

export type ScreenPoint = { x: number; y: number };

type Named = ClusterGroup & {
  text: string;
  c: HTMLCanvasElement;
  tex: CanvasTexture;
  sprite: Sprite;
};

function clusterGroups(nodes: readonly Node3[], rank: Map<string, number>): ClusterGroup[] {
  return [...new Set(nodes.map((n) => n.cluster))].map((cluster) => {
    const own = nodes.filter((n) => n.cluster === cluster);
    const mid = (k: 'x' | 'z') => own.reduce((s, n) => s + n[k], 0) / own.length;
    const central = [...own]
      .sort((a, b) => (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0))
      .slice(0, EXPLORER.v2.central)
      .map((n) => n.id);
    const top = Math.max(...own.map((n) => n.y));
    const ids = new Set(own.map((n) => n.id));
    const at = { x: mid('x'), z: mid('z'), top };
    return { cluster, domain: homeDomain(own[0]), ids, members: own, central, ...at };
  });
}

function nameOf(ctx: Ctx, g: ClusterGroup): Named {
  const text = ctx.opts.clusterLabels?.[g.cluster] ?? g.cluster;
  const c = domainCanvas(text);
  drawDomain(text, c, clusterColour(g.cluster, g.domain, ctx.state.theme));
  const h = EXPLORER.v2.clusterLabelHeight;
  const { sprite, tex } = textSprite(ctx.THREE, c, h, true);
  sprite.position.set(g.x, g.top + h, g.z);
  return { ...g, text, c, tex, sprite };
}

function alphaOf(ctx: Ctx, n: Named) {
  const { state } = ctx;
  const full = EXPLORER.v2.clusterLabelAlpha[state.theme];
  if (state.cluster) return state.cluster.ids === n.ids ? 1 : full * 0.2;
  const v = state.view;
  return state.fx.hood || v?.selected || v?.highlight.size ? full * 0.3 : full;
}

export function createClusterNames(ctx: Ctx) {
  const named = ctx.opts.variant === 'v2' ? clusterGroups(ctx.model.nodes, ctx.model.rank) : [];
  const names = named.map((g) => nameOf(ctx, g));
  for (const n of names) ctx.scene.add(n.sprite);
  const paint = () => {
    for (const n of names) {
      n.sprite.visible = [...n.ids].some((id) => ctx.state.view?.nodes.has(id));
      n.sprite.material.opacity = alphaOf(ctx, n);
    }
  };
  const redraw = () => {
    for (const n of names) {
      drawDomain(n.text, n.c, clusterColour(n.cluster, n.domain, ctx.state.theme));
      n.tex.needsUpdate = true;
    }
  };
  return { names, paint, redraw, at: (point: ScreenPoint) => nameAt(ctx, names, point) };
}

type Vec = InstanceType<Ctx['THREE']['Vector3']>;

function screenRect(ctx: Ctx, n: Named, up: Vec) {
  const cam = cameraOf(ctx.fg);
  const [w, h] = [ctx.el.clientWidth, ctx.el.clientHeight];
  const centre = n.sprite.position.clone().project(cam);
  if (centre.z > 1) return null;
  const edge = n.sprite.position
    .clone()
    .addScaledVector(up, n.sprite.scale.y / 2)
    .project(cam);
  const halfH = (Math.abs(edge.y - centre.y) * h) / 2;
  const halfW = halfH * (n.sprite.scale.x / n.sprite.scale.y);
  return { x: ((centre.x + 1) / 2) * w, y: ((1 - centre.y) / 2) * h, halfW, halfH, z: centre.z };
}

function nameAt(ctx: Ctx, names: Named[], { x, y }: ScreenPoint): Named | null {
  const cam = cameraOf(ctx.fg);
  const up = cam.up.clone().applyQuaternion(cam.quaternion);
  let best: Named | null = null;
  let bestZ = Infinity;
  for (const n of names) {
    const r = n.sprite.visible ? screenRect(ctx, n, up) : null;
    const hit = r && Math.abs(x - r.x) <= r.halfW && Math.abs(y - r.y) <= r.halfH;
    if (hit && r.z < bestZ) [best, bestZ] = [n, r.z];
  }
  return best;
}

export type ClusterNames = ReturnType<typeof createClusterNames>;
