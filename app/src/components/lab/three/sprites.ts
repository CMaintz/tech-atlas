import type { Lab3, Sprite, Three } from './context';

type Group = InstanceType<Three['Group']>;
type SpriteState = { group: Group | null; timer: number };

export type GlowSprites = ReturnType<typeof createSprites>;

export function createSprites(ctx: Lab3) {
  const state: SpriteState = { group: null, timer: 0 };
  const set = (on: boolean) => {
    ctx.L.glow.visible = !on;
    if (on === !!state.group) return;
    window.clearInterval(state.timer);
    if (on) showSprites(ctx, state);
    else hideSprites(ctx, state);
  };
  const each = (fn: (s: Sprite, i: number) => void) =>
    state.group?.children.forEach((c, i) => fn(c as Sprite, i));
  return { set, each, stop: () => window.clearInterval(state.timer), size: spriteSize(ctx) };
}

function showSprites(ctx: Lab3, state: SpriteState) {
  const g = buildSprites(ctx);
  state.timer = window.setInterval(syncer(ctx, g), 250);
  state.group = g;
  ctx.L.scene.add(g);
}

function hideSprites(ctx: Lab3, state: SpriteState) {
  const g = state.group;
  if (!g) return;
  ctx.L.scene.remove(g);
  g.children.forEach((c) => (c as Sprite).material.dispose());
  state.group = null;
}

const spriteSize = (ctx: Lab3) => {
  const glowSize = ctx.L.glow.geometry.getAttribute('size');
  return (i: number) => (glowSize.getX(i) / ctx.cfg.glowScale) * 5;
};

function buildSprites(ctx: Lab3) {
  const texture = ctx.L.glowMat.uniforms.map.value as InstanceType<Three['Texture']>;
  const size = spriteSize(ctx);
  const g = new ctx.THREE.Group();
  ctx.nodes.forEach((n, i) => {
    const sp = termSprite(ctx, texture);
    sp.scale.set(size(i), size(i), 1);
    sp.position.set(n.x, n.y, n.z);
    g.add(sp);
  });
  return g;
}

function termSprite({ THREE }: Lab3, texture: InstanceType<Three['Texture']>) {
  const material = new THREE.SpriteMaterial({
    map: texture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.55,
  });
  return new THREE.Sprite(material);
}

function syncer(ctx: Lab3, g: Group) {
  const glowCol = ctx.L.glow.geometry.getAttribute('color');
  const sync = () =>
    g.children.forEach((c, i) => {
      const sp = c as Sprite;
      const [r, gg, b] = [glowCol.getX(i), glowCol.getY(i), glowCol.getZ(i)];
      sp.visible = r + gg + b > 0;
      sp.material.color.setRGB(r, gg, b);
      matchBlending(ctx, sp);
    });
  sync();
  return sync;
}

function matchBlending({ L, THREE }: Lab3, sp: Sprite) {
  const multiply = L.glowMat.blending === THREE.MultiplyBlending;
  if (sp.material.premultipliedAlpha !== multiply) {
    sp.material.premultipliedAlpha = multiply;
    sp.material.needsUpdate = true;
  }
  sp.material.blending = L.glowMat.blending;
}
