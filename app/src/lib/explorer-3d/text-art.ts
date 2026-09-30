/**
 * Text drawn on canvases for the 3D map's sprites: hub labels, domain names and the
 * relationship names on lit links. Each has its own look; all are sized to their text.
 */
import type { MapTheme } from '../graph-style';
import { MAP_INK } from '../graph-style';
import type { Sprite, Three } from './types';

const HUB_PX = 44;
const DOMAIN_PX = 120;
const TAG_PX = 36;
export const HUB_FONT = `600 ${HUB_PX}px system-ui, sans-serif`;
export const DOMAIN_FONT = `700 ${DOMAIN_PX}px system-ui, sans-serif`;
const TAG_FONT = `500 ${TAG_PX}px system-ui, sans-serif`;

/** A canvas as wide as `text` in `font` plus `padW`, and `height` tall. */
export function textCanvas(text: string, font: string, padW: number, height: number) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  g.font = font;
  c.width = Math.ceil(g.measureText(text).width) + padW;
  c.height = height;
  return c;
}

/** A fresh, centred text context on `c` (resizing a canvas resets its context). */
function centred(c: HTMLCanvasElement, font: string) {
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, c.width, c.height);
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  return g;
}

/** A hub label: light text with a soft halo in the theme's label inks. */
export function drawHub(text: string, c: HTMLCanvasElement, theme: MapTheme) {
  const g = centred(c, HUB_FONT);
  g.shadowColor = MAP_INK[theme].labelShadow3d;
  g.shadowBlur = 10;
  g.fillStyle = MAP_INK[theme].label3d;
  g.fillText(text, c.width / 2, c.height / 2);
  // A second pass thickens the halo on the cream map, where a blur alone is faint.
  if (theme === 'light') g.fillText(text, c.width / 2, c.height / 2);
}

export const hubCanvas = (text: string) => textCanvas(text, HUB_FONT, 24, HUB_PX + 20);

/** A domain's name, large, in the domain's colour. */
export function drawDomain(text: string, c: HTMLCanvasElement, colour: string) {
  const g = centred(c, DOMAIN_FONT);
  g.fillStyle = colour;
  g.fillText(text, c.width / 2, c.height / 2);
}

export const domainCanvas = (text: string) => textCanvas(text, DOMAIN_FONT, 40, DOMAIN_PX + 40);

/** A relationship's name: label ink with a stroked halo. */
export function tagCanvas(text: string, theme: MapTheme) {
  const c = textCanvas(text, TAG_FONT, 16, Math.ceil(TAG_PX * 1.4));
  const g = centred(c, TAG_FONT);
  g.lineJoin = 'round';
  g.lineWidth = 8;
  g.strokeStyle = MAP_INK[theme].halo;
  g.strokeText(text, c.width / 2, c.height / 2);
  g.fillStyle = MAP_INK[theme].label3d;
  g.fillText(text, c.width / 2, c.height / 2);
  return c;
}

/** A billboard of canvas `c`, `height` scene units tall, and its texture. */
export function textSprite(THREE: Three, c: HTMLCanvasElement, height: number, fog: boolean) {
  const tex = new THREE.CanvasTexture(c);
  const sprite: Sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog }),
  );
  sprite.scale.set((height * c.width) / c.height, height, 1);
  return { sprite, tex };
}
