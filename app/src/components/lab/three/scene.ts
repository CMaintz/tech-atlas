import type { UnrealBloomPass as Bloom } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { OutputPass as Output } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { MapTheme } from '../../../lib/graph-style';
import type { Lab3D } from '../../../lib/explorer-lab';
import type { Fg, Lab3, Obj } from './context';
import type { GlowSprites } from './sprites';

type BloomPasses = { Bloom: typeof Bloom; Output: typeof Output };

export type BloomToggle = ReturnType<typeof createBloom>;

export function createBloom(ctx: Lab3, passes: BloomPasses) {
  let bloom: Bloom | null = null;
  const output = new passes.Output();
  const set = (on: boolean, theme: MapTheme) => {
    const current = bloom;
    if (on && !current) bloom = addBloom(ctx, passes, output);
    else if (!on && current) {
      removeBloom(ctx.fg, current, output);
      bloom = null;
    }
    if (bloom) bloom.enabled = theme !== 'light';
  };
  return { set, enabled: () => !!bloom?.enabled };
}

function addBloom({ fg, THREE }: Lab3, passes: BloomPasses, output: Output) {
  const composer = fg.postProcessingComposer();
  const bloom = new passes.Bloom(new THREE.Vector2(fg.width(), fg.height()), 0.9, 0.5, 0.55);
  composer.addPass(bloom);
  composer.addPass(output);
  return bloom;
}

function removeBloom(fg: Fg, bloom: Bloom, output: Output) {
  const composer = fg.postProcessingComposer();
  composer.removePass(bloom);
  composer.removePass(output);
  bloom.dispose();
}

export function createSpacing(ctx: Lab3, sprites: GlowSprites) {
  const { L, THREE } = ctx;
  const labelScale = new Map<object, [number, number]>();
  L.scene.children.forEach((c) => {
    if (c instanceof THREE.Sprite) labelScale.set(c, [c.scale.x, c.scale.y]);
  });
  return (k: number) => {
    L.scene.scale.setScalar(k);
    for (const n of ctx.nodes) n.__threeObj?.scale.setScalar(1 / k);
    for (const [c, [x, y]] of labelScale) (c as Obj).scale.set(x / k, y / k, 1);
    sprites.each((c, i) => c.scale.set(sprites.size(i) / k, sprites.size(i) / k, 1));
  };
}

export function createSceneLook(ctx: Lab3) {
  const { L, THREE, fg, cfg } = ctx;
  const fog = L.scene.fog;
  return (s: Lab3D, bloomOn: boolean) => {
    ctx.m.spin(s.spin);
    L.scene.fog = s.fog ? fog : null;
    L.scene.background = bloomOn ? new THREE.Color(fg.backgroundColor()) : null;
    L.glowMat.uniforms.fogDensity.value = s.fog ? cfg.fogDensity : 0;
    L.flowMat.uniforms.fogDensity.value = s.fog ? cfg.fogDensity : 0;
  };
}
