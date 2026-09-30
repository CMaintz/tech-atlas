/**
 * Emphasis by importance and the cream map's tone in the visual lab's (A96) 3D map:
 * per-link intensity fed to explorer-3d's web gain / tint hooks and to the tubes, and
 * term colour and glow strength.
 */
import { clusterColour, homeDomain, type MapTheme } from '../../../lib/graph-style';
import {
  alphaGain,
  emphasise,
  emphasisChannels,
  importance,
  intensity,
  tone,
  toneActive,
  type Lab3D,
} from '../../../lib/explorer-lab';
import { nodeOf, type Lab3, type LinkLike } from './context';

export type Emphasis3D = ReturnType<typeof createEmphasis>;

export function createEmphasis(ctx: Lab3) {
  const imp = importance(ctx.links);
  const indexOf = new Map(ctx.links.map((l, i) => [l, i]));
  let kOf = new Float32Array(ctx.links.length).fill(1);
  const apply = (s: Lab3D, theme: MapTheme) => {
    kOf = new Float32Array(imp.map((v) => (s.emph !== 'off' ? intensity(v, s.spread) : 1)));
    webEmphasis(ctx, s, theme, kOf);
    termTone(ctx, s, theme);
    ctx.L.repaint();
  };
  /** A link's intensity (1 with emphasis off). */
  const k = (l: LinkLike) => kOf[indexOf.get(l) ?? 0];
  return { apply, k };
}

/** Each link's web gain (opacity) and tint (colour), or no tint (today's). */
function webEmphasis(ctx: Lab3, s: Lab3D, theme: MapTheme, kOf: Float32Array) {
  const { alpha, colour } = emphasisChannels(s.emph);
  const toned = theme === 'light' && toneActive(s);
  const tint = colour || toned ? tinter(ctx, s, theme, colour) : null;
  ctx.links.forEach((l, i) => {
    ctx.L.webGain[i] = (alpha ? alphaGain(kOf[i]) : 1) * (toned ? s.edgeAlpha : 1);
    ctx.L.webTint[i] = tint ? tint(l, kOf[i]) : null;
  });
}

/** A link's tint: its source cluster's colour, emphasised by k and/or toned. */
function tinter(ctx: Lab3, s: Lab3D, theme: MapTheme, emphasised: boolean) {
  const toned = theme === 'light' && toneActive(s);
  return (l: LinkLike, k: number) => {
    const src = nodeOf(ctx, l.source);
    let c = clusterColour(src.cluster, homeDomain(src), theme);
    if (emphasised) c = emphasise(c, k, theme === 'light');
    if (toned) c = tone(c, 1, -s.edgeDark);
    return new ctx.THREE.Color(c);
  };
}

/** Terms: saturation and lightness over the Explorer's own colour; glow / shadow strength. */
function termTone(ctx: Lab3, s: Lab3D, theme: MapTheme) {
  const { fg, prod, L, cfg } = ctx;
  const light = theme === 'light';
  const toned = light && toneActive(s);
  fg.nodeColor(toned ? (n) => tone(prod.node(n), s.nodeSat, s.nodeLight) : prod.node);
  L.glowMat.uniforms.opacity.value = cfg.glowOpacity * (light ? 0.7 : 1) * (toned ? s.shadow : 1);
}
