/**
 * The visual lab's 3D runtime: built once per 3D map, it applies a toggle state
 * (and the theme), touching only what changed since the last one.
 */
import type { Map3D } from '../../../lib/explorer-3d';
import { homeDomain, type MapTheme } from '../../../lib/graph-style';
import { DEFAULT_3D, toneChanged, type Lab3D } from '../../../lib/explorer-lab';
import { groupIndices } from '../../../lib/explorer-lab/geometry';
import { labContext, type Lab3 } from './context';
import { createBender } from './curves';
import { createSprites } from './sprites';
import { createBloom, createSceneLook, createSpacing } from './scene';
import { createEmphasis } from './emphasis';
import { createClusterNames } from './cluster-names';
import { createRelayout } from './relayout';
import { styleLinks } from './links';

export type Lab3DRuntime = { apply: (s: Lab3D, theme: MapTheme) => void; dispose: () => void };

export async function setup3D(m: Map3D, clusterLabels: Record<string, string>) {
  const [{ UnrealBloomPass }, { OutputPass }] = await Promise.all([
    import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
    import('three/examples/jsm/postprocessing/OutputPass.js'),
  ]);
  const ctx = labContext(m);
  const bender = createBender(ctx);
  const sprites = createSprites(ctx);
  const bloom = createBloom(ctx, { Bloom: UnrealBloomPass, Output: OutputPass });
  const spacing = createSpacing(ctx, sprites);
  const look = createSceneLook(ctx);
  const emphasis = createEmphasis(ctx);
  const groups = termGroups(ctx);
  const names = createClusterNames(ctx, clusterLabels, groups.byCluster);
  const relayout = createRelayout(ctx, { bender, sprites, names, ...groups });
  const parts = { ctx, bender, sprites, bloom, spacing, look, emphasis, names, relayout };
  return runtime(parts);
}

/** Term indices by cluster and by home domain. */
const termGroups = (ctx: Lab3) => ({
  byCluster: groupIndices(ctx.nodes, (n) => n.cluster),
  byDomain: groupIndices(ctx.nodes, (n) => homeDomain(n)),
});

type Parts = {
  ctx: Lab3;
  bender: ReturnType<typeof createBender>;
  sprites: ReturnType<typeof createSprites>;
  bloom: ReturnType<typeof createBloom>;
  spacing: ReturnType<typeof createSpacing>;
  look: ReturnType<typeof createSceneLook>;
  emphasis: ReturnType<typeof createEmphasis>;
  names: ReturnType<typeof createClusterNames>;
  relayout: ReturnType<typeof createRelayout>;
};

function runtime(p: Parts): Lab3DRuntime {
  let last: Lab3D | null = null;
  let lastTheme: MapTheme | null = null;
  return {
    apply(s, theme) {
      const emphChanged = !last || lastTheme !== theme || emphasisChanged(last, s);
      if (emphChanged) p.emphasis.apply(s, theme);
      p.relayout(s, last?.curvature ?? DEFAULT_3D.curvature);
      if (!last || last.clabels !== s.clabels || lastTheme !== theme) p.names.set(s.clabels, theme);
      if (!last || emphChanged || linksChanged(last, s)) {
        styleLinks(p.ctx, s, theme, p.emphasis);
        p.bender.bend(s.curvature);
      }
      applyScene(p, s, theme);
      last = s;
      lastTheme = theme;
    },
    dispose() {
      p.sprites.stop();
      p.names.set(false, 'dark');
    },
  };
}

const emphasisChanged = (a: Lab3D, b: Lab3D) =>
  a.emph !== b.emph || a.spread !== b.spread || toneChanged(a, b);

const linksChanged = (a: Lab3D, b: Lab3D) =>
  a.links !== b.links || a.flow !== b.flow || a.speed !== b.speed || a.curvature !== b.curvature;

/** Glow sprites, bloom, auto-rotate, fog and spacing (cheap: set every time). */
function applyScene(p: Parts, s: Lab3D, theme: MapTheme) {
  p.sprites.set(s.glow === 'sprites');
  p.bloom.set(s.bloom, theme);
  p.look(s, p.bloom.enabled());
  p.spacing(s.spacing);
}
