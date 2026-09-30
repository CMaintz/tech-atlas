/**
 * Glow: one additive point cloud, a soft halo per term (A86). A shared term glows in
 * its second domain's colour — a halo round a sphere in its own; a receded term barely.
 */
import { EXPLORER } from '../explorer-config';
import { glowMaterial } from './shaders';
import type { Ctx } from './context';
import { DRAW } from './graph3d';
import { inkOf, isLight } from './lens';
import type { Colour, Node3 } from './types';

/** No glow is black added to the night map, white multiplied into the cream one. */
function glowOf(ctx: Ctx, n: Node3, col: Colour) {
  const { view } = ctx.state;
  const light = isLight(ctx);
  const faded = ctx.lens.faded(n.id);
  if (!view?.nodes.has(n.id) || (light && faded)) return col.setRGB(+light, +light, +light);
  if (faded) return col.setRGB(0.02, 0.02, 0.03);
  const ring = view.bands(n)[1];
  return col.set(n.id === view.selected ? inkOf(ctx).selected : (ring ?? view.colour(n)));
}

export function createGlow(ctx: Ctx) {
  const { THREE, model } = ctx;
  const geo = new THREE.BufferGeometry();
  const at = model.nodes.flatMap((n) => [n.x, n.y, n.z]);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(at, 3));
  const colours = new THREE.Float32BufferAttribute(new Float32Array(model.nodes.length * 3), 3);
  geo.setAttribute('color', colours);
  const sizes = model.nodes.map((n) => model.radius(n) * EXPLORER.three.glowScale);
  geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  const material = glowMaterial(THREE, ctx.el.clientHeight);
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  points.renderOrder = DRAW.glow;
  ctx.scene.add(points);
  const paint = () => {
    const col = new THREE.Color();
    model.nodes.forEach((n, i) => {
      const { r, g, b } = glowOf(ctx, n, col);
      colours.setXYZ(i, r, g, b);
    });
    colours.needsUpdate = true;
  };
  return { points, material, paint };
}
