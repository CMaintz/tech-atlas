/** Faint cluster names in the visual lab's 3D map: one sprite at each cluster's centre. */
import { MAP_INK, type MapTheme } from '../../../lib/graph-style';
import { centroid } from '../../../lib/explorer-lab/geometry';
import type { Lab3, Sprite } from './context';

export type ClusterNames = ReturnType<typeof createClusterNames>;

export function createClusterNames(
  ctx: Lab3,
  labels: Record<string, string>,
  byCluster: Map<string, number[]>,
) {
  const names = new Map<string, Sprite>();
  /** Each name above its cluster's highest term, at the cluster's centre. */
  const place = () => {
    for (const [c, sprite] of names) {
      const ids = byCluster.get(c)!;
      const p = centroid(ids, ctx.nodes);
      const top = Math.max(...ids.map((i) => ctx.nodes[i].y));
      sprite.position.set(p.x, top + 30, p.z);
    }
  };
  const set = (on: boolean, theme: MapTheme) => {
    clear(ctx, names);
    if (!on) return;
    for (const c of byCluster.keys()) {
      const sprite = nameSprite(ctx, labels[c] ?? c, theme);
      names.set(c, sprite);
      ctx.L.scene.add(sprite);
    }
    place();
  };
  return { set, place };
}

function clear(ctx: Lab3, names: Map<string, Sprite>) {
  for (const s of names.values()) {
    ctx.L.scene.remove(s);
    s.material.map?.dispose();
    s.material.dispose();
  }
  names.clear();
}

/** A name as a faint sprite, 20 units tall. */
function nameSprite({ THREE }: Lab3, text: string, theme: MapTheme): Sprite {
  const canvas = nameCanvas(text, MAP_INK[theme].tick);
  const material = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    fog: true,
  });
  const sprite = new THREE.Sprite(material);
  const h = 20;
  sprite.scale.set((h * canvas.width) / canvas.height, h, 1);
  return sprite;
}

/** The name drawn centred on a canvas just big enough for it. */
function nameCanvas(text: string, colour: string) {
  const canvas = document.createElement('canvas');
  const g = canvas.getContext('2d')!;
  const px = 40;
  g.font = `500 ${px}px system-ui, sans-serif`;
  canvas.width = Math.ceil(g.measureText(text).width) + 16;
  canvas.height = px + 16;
  g.font = `500 ${px}px system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = colour;
  g.fillText(text, canvas.width / 2, canvas.height / 2);
  return canvas;
}
