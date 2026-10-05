/**
 * Relationship names on the lit links: a billboarded sprite per lit link of the
 * selected (or a lightly linked hovered) term, a constant size on screen just above the
 * link's midpoint, read from that term's side. Each frame the names are projected and
 * those that would overlap give way to heavier links; the link under the pointer always
 * shows its name.
 */
import { EXPLORER } from '../explorer-config';
import { cullBoxes, labelPov, relationLabel, type LabelBox } from '../explorer-focus';
import { midpoint } from './curves';
import { endId } from './model';
import { tagCanvas } from './text-art';
import type { Ctx } from './context';
import { DRAW, cameraOf } from './graph3d';
import type { CanvasTexture, Camera, Link3, Sprite, Vec3 } from './types';

type Tag = { i: number; weight: number; aspect: number; sprite: Sprite };
type TagArt = { tex: CanvasTexture; aspect: number };

const TAG_PX = EXPLORER.edgeLabels.px3d;

/** A name's texture, drawn once per text and theme. */
function createArtCache(ctx: Ctx) {
  const cache = new Map<string, TagArt>();
  const artFor = (text: string) => {
    const had = cache.get(text);
    if (had) return had;
    const c = tagCanvas(text, ctx.state.theme);
    const art = { tex: new ctx.THREE.CanvasTexture(c), aspect: c.width / c.height };
    cache.set(text, art);
    return art;
  };
  const clear = () => {
    for (const a of cache.values()) a.tex.dispose();
    cache.clear();
  };
  return { artFor, clear };
}

/** Name sprites, made as needed and reused. */
function createSpritePool({ THREE, scene }: Ctx) {
  const pool: Sprite[] = [];
  return (n: number) => {
    if (pool[n]) return pool[n];
    const sprite: Sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        fog: false,
        sizeAttenuation: false,
      }),
    );
    // Anchored below its centre, so the name sits just above the link.
    sprite.center.set(0.5, -0.25);
    sprite.renderOrder = DRAW.tags;
    sprite.frustumCulled = false;
    pool.push(sprite);
    scene.add(sprite);
    return sprite;
  };
}

/** The lit links to name, and the term they are read from; none without a point of view. */
function namedLinks({ lens, state, model, opts }: Ctx) {
  const view = state.view;
  if (!view || !opts.relationNames) return [];
  const lit = model.links.filter(lens.linkShown);
  const pov = labelPov(state.fx, view.selected, lit.length, EXPLORER.edgeLabels.hoverMax);
  if (!pov || !view.nodes.has(pov)) return [];
  const { label, inverse } = opts.relationNames;
  return lit.flatMap((l: Link3) => {
    const [source, target] = [endId(l.source), endId(l.target)];
    if (source !== pov && target !== pov) return [];
    return [{ l, text: relationLabel({ source, target, type: l.type }, pov, label, inverse) }];
  });
}

/** Where a name lands on screen, or null when it is off it. */
function screenBox(t: Tag, cam: Camera, at: Vec3, w: number, h: number) {
  at.copy(t.sprite.position).project(cam);
  if (at.z > 1 || Math.abs(at.x) > 1.2 || Math.abs(at.y) > 1.2) return null;
  const box: LabelBox = {
    id: String(t.i),
    x: ((at.x + 1) / 2) * w,
    y: ((1 - at.y) / 2) * h - TAG_PX * 0.9,
    w: TAG_PX * t.aspect,
    h: TAG_PX,
  };
  return box;
}

export function createTags(ctx: Ctx, curve: Float32Array) {
  const art = createArtCache(ctx);
  const spriteAt = createSpritePool(ctx);
  let tags: Tag[] = [];
  const paint = () => {
    for (const t of tags) t.sprite.visible = false;
    tags = namedLinks(ctx).map(({ l, text }, n) => {
      const { tex, aspect } = art.artFor(text);
      const sprite = spriteAt(n);
      sprite.material.map = tex;
      sprite.material.needsUpdate = true;
      sprite.position.set(...midpoint(curve, l.i));
      return { i: l.i, weight: l.weight, aspect, sprite };
    });
    tags.sort((a, b) => b.weight - a.weight);
  };
  return { paint, place: createPlacer(ctx, () => tags), clearArt: art.clear };
}

/** Per frame: size every name for the camera, and cull the overlapping ones. */
function createPlacer({ THREE, fg, el, state }: Ctx, current: () => Tag[]) {
  const at = new THREE.Vector3();
  return () => {
    const tags = current();
    if (!tags.length) return;
    const cam = cameraOf(fg);
    const [w, h] = [el.clientWidth, el.clientHeight];
    // With sizeAttenuation off a sprite's height on screen is scale × P[5] × h / 2.
    const k = (2 * TAG_PX) / (cam.projectionMatrix.elements[5] * h);
    const under = tags.filter((t) => t.i === state.underLink);
    const boxes: LabelBox[] = [];
    for (const t of [...under, ...tags.filter((x) => x.i !== state.underLink)]) {
      t.sprite.scale.set(k * t.aspect, k, 1);
      const box = screenBox(t, cam, at, w, h);
      if (box) boxes.push(box);
    }
    const kept = cullBoxes(boxes);
    for (const t of tags) t.sprite.visible = kept.has(String(t.i));
  };
}
