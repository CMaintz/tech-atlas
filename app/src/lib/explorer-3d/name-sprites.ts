import type { Ctx } from './context';
import { DRAW } from './graph3d';
import type { CanvasTexture, Sprite } from './types';

type NameArt = { tex: CanvasTexture; aspect: number };

export function createArtCache(ctx: Ctx, draw: (text: string) => HTMLCanvasElement) {
  const cache = new Map<string, NameArt>();
  const artFor = (text: string) => {
    const had = cache.get(text);
    if (had) return had;
    const c = draw(text);
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

function nameSprite({ THREE }: Ctx, anchorY: number): Sprite {
  const sprite: Sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      fog: false,
      sizeAttenuation: false,
    }),
  );
  sprite.center.set(0.5, anchorY);
  sprite.renderOrder = DRAW.tags;
  sprite.frustumCulled = false;
  return sprite;
}

export function createSpritePool(ctx: Ctx, anchorY: number) {
  const pool: Sprite[] = [];
  return (n: number) => {
    if (!pool[n]) {
      pool[n] = nameSprite(ctx, anchorY);
      ctx.scene.add(pool[n]);
    }
    return pool[n];
  };
}
