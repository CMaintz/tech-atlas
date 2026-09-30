/**
 * Scene-wide 3D toggles in the visual lab (A96): bloom, node spacing, fog and
 * auto-rotation.
 */
import type { UnrealBloomPass as Bloom } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { OutputPass as Output } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { MapTheme } from '../../../lib/graph-style';
import type { Lab3D } from '../../../lib/explorer-lab';
import type { Lab3, Obj } from './context';
import type { GlowSprites } from './sprites';

export type BloomToggle = ReturnType<typeof createBloom>;

/**
 * Bloom: an UnrealBloomPass on 3d-force-graph's composer and an OutputPass for the colour
 * space. Bloom brightens what is already bright: on the cream map it only washes it out,
 * so it is disabled there.
 */
export function createBloom(ctx: Lab3, passes: { Bloom: typeof Bloom; Output: typeof Output }) {
  const { fg, THREE } = ctx;
  let bloom: Bloom | null = null;
  const output = new passes.Output();
  const set = (on: boolean, theme: MapTheme) => {
    if (on !== !!bloom) {
      const composer = fg.postProcessingComposer();
      if (on) {
        bloom = new passes.Bloom(new THREE.Vector2(fg.width(), fg.height()), 0.9, 0.5, 0.55);
        composer.addPass(bloom);
        composer.addPass(output);
      } else {
        composer.removePass(bloom);
        composer.removePass(output);
        bloom!.dispose();
        bloom = null;
      }
    }
    if (bloom) bloom.enabled = theme !== 'light';
  };
  return { set, enabled: () => !!bloom?.enabled };
}

/** Spacing: the scene scales about the origin; terms, labels and sprites keep their size. */
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

/**
 * Auto-rotate, fog (the scene's and the shaders'), and — with bloom on — an opaque
 * background in the theme's colour (bloom needs one; the canvas is transparent).
 */
export function createSceneLook(ctx: Lab3) {
  const { L, THREE, fg, cfg } = ctx;
  // The scene's own fog, recoloured by `retheme`; the lab only switches it off and on.
  const fog = L.scene.fog;
  return (s: Lab3D, bloomOn: boolean) => {
    ctx.m.spin(s.spin);
    L.scene.fog = s.fog ? fog : null;
    L.scene.background = bloomOn ? new THREE.Color(fg.backgroundColor()) : null;
    L.glowMat.uniforms.fogDensity.value = s.fog ? cfg.fogDensity : 0;
    L.flowMat.uniforms.fogDensity.value = s.fog ? cfg.fogDensity : 0;
  };
}
