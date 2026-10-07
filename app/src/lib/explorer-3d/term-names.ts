import { EXPLORER } from '../explorer-config';
import { cullBoxes, type LabelBox } from '../explorer-focus';
import type { Ctx } from './context';
import { cameraOf } from './graph3d';
import { litTerms } from './lit-terms';
import { createArtCache, createSpritePool } from './name-sprites';
import { hubName } from './text-art';
import type { Camera, Node3, Sprite, Vec3 } from './types';

type Name = { id: string; aspect: number; sprite: Sprite };

const NAME_PX = EXPLORER.v2.termLabelPx;

function screenBoxOf(name: Name, ctx: Ctx, at: Vec3): LabelBox | null {
  const cam = cameraOf(ctx.fg);
  at.copy(name.sprite.position).project(cam);
  if (at.z > 1 || Math.abs(at.x) > 1.2 || Math.abs(at.y) > 1.2) return null;
  const [w, h] = [ctx.el.clientWidth, ctx.el.clientHeight];
  return {
    id: name.id,
    x: ((at.x + 1) / 2) * w,
    y: ((1 - at.y) / 2) * h - NAME_PX * 0.6,
    w: NAME_PX * name.aspect * 1.05,
    h: NAME_PX * 1.1,
  };
}

const unattenuatedSpriteScaleForPx = (cam: Camera, viewHeight: number, px: number) =>
  (2 * px) / (cam.projectionMatrix.elements[5] * viewHeight);

function createOverlapCuller(ctx: Ctx, current: () => Name[]) {
  const at = new ctx.THREE.Vector3();
  return () => {
    const names = current();
    if (!names.length) return;
    const cam = cameraOf(ctx.fg);
    const k = unattenuatedSpriteScaleForPx(cam, ctx.el.clientHeight, NAME_PX);
    const boxes: LabelBox[] = [];
    for (const n of names) {
      n.sprite.scale.set(k * n.aspect, k, 1);
      const box = screenBoxOf(n, ctx, at);
      if (box) boxes.push(box);
    }
    const kept = cullBoxes(boxes);
    for (const n of names) n.sprite.visible = kept.has(n.id);
  };
}

export function createTermNames(ctx: Ctx) {
  const art = createArtCache(ctx, (text) => hubName(text, ctx.state.theme));
  const spriteAt = createSpritePool(ctx, -0.15);
  let names: Name[] = [];
  const name = (node: Node3, i: number): Name => {
    const { tex, aspect } = art.artFor(node.term[ctx.opts.lang]);
    const sprite = spriteAt(i);
    sprite.material.map = tex;
    sprite.material.needsUpdate = true;
    sprite.position.set(node.x, node.y + ctx.model.radius(node), node.z);
    return { id: node.id, aspect, sprite };
  };
  const paint = () => {
    for (const n of names) n.sprite.visible = false;
    names = ctx.opts.variant === 'v2' ? litTerms(ctx).map(name) : [];
  };
  return { paint, place: createOverlapCuller(ctx, () => names), clearArt: art.clear };
}
