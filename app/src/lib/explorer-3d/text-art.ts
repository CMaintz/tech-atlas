/**
 * Text drawn on canvases for the 3D map's sprites: hub labels, domain names and the
 * relationship names on lit links. Each has its own look; all are sized to their text.
 */
import { MAP_INK, type MapTheme } from '../graph-style';
import type { Sprite, Three } from './types';

const HUB_PX = 44;
const DOMAIN_PX = 120;
const TAG_PX = 36;
const HUB_FONT = `600 ${HUB_PX}px system-ui, sans-serif`;
const DOMAIN_FONT = `700 ${DOMAIN_PX}px system-ui, sans-serif`;
const TAG_FONT = `500 ${TAG_PX}px system-ui, sans-serif`;

/** A kind of text's canvas: its font, the width added to the text's, and its height. */
type Look = { font: string; padW: number; height: number };
const HUB: Look = { font: HUB_FONT, padW: 24, height: HUB_PX + 20 };
const DOMAIN: Look = { font: DOMAIN_FONT, padW: 40, height: DOMAIN_PX + 40 };
const TAG: Look = { font: TAG_FONT, padW: 16, height: Math.ceil(TAG_PX * 1.4) };

function context2d(c: HTMLCanvasElement) {
  const g = c.getContext('2d');
  if (!g) throw new Error('3D map: no 2D context for a text sprite');
  return g;
}

/** A canvas as wide as `text` in the look's font plus its padding, and the look's height. */
function textCanvas(text: string, { font, padW, height }: Look) {
  const c = document.createElement('canvas');
  const g = context2d(c);
  g.font = font;
  c.width = Math.ceil(g.measureText(text).width) + padW;
  c.height = height;
  return c;
}

/** A fresh, centred text context on `c` (resizing a canvas resets its context). */
function centred(c: HTMLCanvasElement, font: string) {
  const g = context2d(c);
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

export const hubCanvas = (text: string) => textCanvas(text, HUB);

/** A term's name in the hub labels' look, on a canvas of its own. */
export function hubName(text: string, theme: MapTheme) {
  const c = hubCanvas(text);
  drawHub(text, c, theme);
  return c;
}

/** A domain's name, large, in the domain's colour. */
export function drawDomain(text: string, c: HTMLCanvasElement, colour: string) {
  const g = centred(c, DOMAIN_FONT);
  g.fillStyle = colour;
  g.fillText(text, c.width / 2, c.height / 2);
}

export const domainCanvas = (text: string) => textCanvas(text, DOMAIN);

/** A relationship's name: label ink with a stroked halo. */
export function tagCanvas(text: string, theme: MapTheme) {
  const c = textCanvas(text, TAG);
  const g = centred(c, TAG_FONT);
  g.lineJoin = 'round';
  g.lineWidth = 8;
  g.strokeStyle = MAP_INK[theme].halo;
  g.strokeText(text, c.width / 2, c.height / 2);
  g.fillStyle = MAP_INK[theme].label3d;
  g.fillText(text, c.width / 2, c.height / 2);
  return c;
}

/** A sprite's height in scene units, and whether the scene's fog dims it. */
type SpriteLook = { height: number; fog: boolean };

/** A billboard of canvas `c`, and its texture. */
export function textSprite(THREE: Three, c: HTMLCanvasElement, { height, fog }: SpriteLook) {
  const tex = new THREE.CanvasTexture(c);
  const sprite: Sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog }),
  );
  sprite.scale.set((height * c.width) / c.height, height, 1);
  return { sprite, tex };
}
