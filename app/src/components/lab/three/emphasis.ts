import { clusterColour, homeDomain } from '../../../lib/graph-style';
import {
  alphaGain,
  emphasise,
  emphasisChannels,
  importance,
  intensity,
  tone,
  toneActive,
} from '../../../lib/explorer-lab';
import { nodeOf, type Lab3, type LabLook, type LinkLike } from './context';

export type Emphasis3D = ReturnType<typeof createEmphasis>;

export function createEmphasis(ctx: Lab3) {
  const imp = importance(ctx.links);
  const indexOf = new Map(ctx.links.map((l, i) => [l, i]));
  let kOf = new Float32Array(ctx.links.length).fill(1);
  const apply = (look: LabLook) => {
    const { s } = look;
    kOf = new Float32Array(imp.map((v) => (s.emph !== 'off' ? intensity(v, s.spread) : 1)));
    webEmphasis(ctx, look, kOf);
    termTone(ctx, look);
    ctx.L.repaint();
  };
  const k = (l: LinkLike) => kOf[indexOf.get(l) ?? 0];
  return { apply, k };
}

function webEmphasis(ctx: Lab3, look: LabLook, kOf: Float32Array) {
  const { s, theme } = look;
  const { alpha, colour } = emphasisChannels(s.emph);
  const toned = theme === 'light' && toneActive(s);
  const tint = colour || toned ? tinter(ctx, look, colour) : null;
  ctx.links.forEach((l, i) => {
    ctx.L.webGain[i] = (alpha ? alphaGain(kOf[i]) : 1) * (toned ? s.edgeAlpha : 1);
    ctx.L.webTint[i] = tint ? tint(l, kOf[i]) : null;
  });
}

function tinter(ctx: Lab3, { s, theme }: LabLook, emphasised: boolean) {
  const toned = theme === 'light' && toneActive(s);
  return (l: LinkLike, k: number) => {
    const src = nodeOf(ctx, l.source);
    let c = clusterColour(src.cluster, homeDomain(src), theme);
    if (emphasised) c = emphasise(c, k, theme === 'light');
    if (toned) c = tone(c, 1, -s.edgeDark);
    return new ctx.THREE.Color(c);
  };
}

function termTone(ctx: Lab3, { s, theme }: LabLook) {
  const { fg, prod, L, cfg } = ctx;
  const light = theme === 'light';
  const toned = light && toneActive(s);
  fg.nodeColor(toned ? (n) => tone(prod.node(n), s.nodeSat, s.nodeLight) : prod.node);
  L.glowMat.uniforms.opacity.value = cfg.glowOpacity * (light ? 0.7 : 1) * (toned ? s.shadow : 1);
}
