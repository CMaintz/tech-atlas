/**
 * The old 3D glow (A96 visual lab): one additive sprite per term, its colour copied from
 * the point cloud's four times a second, in place of today's single point cloud.
 */
import type { Lab3, Sprite, Three } from './context';

export type GlowSprites = ReturnType<typeof createSprites>;

export function createSprites(ctx: Lab3) {
  const { L } = ctx;
  let group: InstanceType<Three['Group']> | null = null;
  let timer = 0;
  const set = (on: boolean) => {
    L.glow.visible = !on;
    if (on === !!group) return;
    window.clearInterval(timer);
    if (on) {
      const g = buildSprites(ctx);
      timer = window.setInterval(syncer(ctx, g), 250);
      group = g;
      L.scene.add(g);
    } else {
      L.scene.remove(group!);
      group!.children.forEach((c) => (c as Sprite).material.dispose());
      group = null;
    }
  };
  /** Each sprite, with its term's index. */
  const each = (fn: (s: Sprite, i: number) => void) =>
    group?.children.forEach((c, i) => fn(c as Sprite, i));
  return { set, each, stop: () => window.clearInterval(timer), size: spriteSize(ctx) };
}

/** A term's sprite size, from the point cloud's own. */
const spriteSize = (ctx: Lab3) => {
  const glowSize = ctx.L.glow.geometry.getAttribute('size');
  return (i: number) => (glowSize.getX(i) / ctx.cfg.glowScale) * 5;
};

function buildSprites(ctx: Lab3) {
  const { L, THREE } = ctx;
  const texture = L.glowMat.uniforms.map.value as InstanceType<Three['Texture']>;
  const size = spriteSize(ctx);
  const g = new THREE.Group();
  ctx.nodes.forEach((n, i) => {
    const material = new THREE.SpriteMaterial({
      map: texture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.55,
    });
    const sp = new THREE.Sprite(material);
    sp.scale.set(size(i), size(i), 1);
    sp.position.set(n.x, n.y, n.z);
    g.add(sp);
  });
  return g;
}

/** Copy the point cloud's colours and blending onto the sprites; runs once now. */
function syncer(ctx: Lab3, g: InstanceType<Three['Group']>) {
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

/**
 * The light theme multiplies instead of adding (explorer-3d `setBlend`); three.js needs
 * premultiplied alpha for that.
 */
function matchBlending({ L, THREE }: Lab3, sp: Sprite) {
  const multiply = L.glowMat.blending === THREE.MultiplyBlending;
  if (sp.material.premultipliedAlpha !== multiply) {
    sp.material.premultipliedAlpha = multiply;
    sp.material.needsUpdate = true;
  }
  sp.material.blending = L.glowMat.blending;
}
