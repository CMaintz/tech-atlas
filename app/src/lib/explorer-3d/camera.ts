/**
 * The 3D map's camera: a slow swoop in from far out, framing the part of the canvas the
 * legend leaves clear, gliding to a term, keyboard flight, auto-rotation, and the
 * drag ring while the mouse orbits or pans.
 */
import { EXPLORER } from '../explorer-config';
import { createDragFeedback, orbitDragKind } from '../drag-feedback';
import type { Axes } from '../explorer-keys';
import type { Point3 } from '../graph-layout';
import type { Ctx } from './context';
import type { PointsMaterial3 } from './shaders';
import { cameraOf, orbitOf } from './graph3d';
import type { Camera, Vec3 } from './types';

/** Where the camera rests (and swoops in from), looking at the scene's centre. */
export function cameraPose(nodes: readonly Point3[]) {
  const mean = (k: 'x' | 'y' | 'z') => nodes.reduce((s, n) => s + n[k], 0) / nodes.length;
  const centre = { x: mean('x'), y: mean('y'), z: mean('z') };
  const extent = Math.max(...nodes.map((n) => Math.hypot(n.x - centre.x, n.z - centre.z)));
  const at = (side: number, up: number, back: number) => ({
    x: centre.x + extent * side,
    y: centre.y + extent * up,
    z: centre.z + extent * back,
  });
  return { centre, rest: at(0, 0.85, 1.75), from: at(1.2, 2.6, 3.2) };
}

/** Where to look at term `n` from: out from the scene's axis, a little above. */
export function viewOf(n: Point3, d = 260) {
  const r = Math.hypot(n.x, n.z) || 1;
  return { x: n.x + (n.x / r) * d, y: n.y + d * 0.5, z: n.z + (n.z / r) * d };
}

function swoopIn({ fg, model, motion }: Ctx) {
  const { centre, rest, from } = cameraPose(model.nodes);
  if (!motion) return void fg.cameraPosition(rest, centre);
  fg.cameraPosition(from, centre);
  window.setTimeout(() => fg.cameraPosition(rest, centre, EXPLORER.three.introMs), 60);
}

/**
 * Fit the canvas: size, point scale, and centre the scene in the part of the canvas
 * the legend leaves clear — in the overview, widening the lens so it all fits there.
 */
function fitter({ fg, el, opts, state }: Ctx, points: PointsMaterial3[]) {
  return () => {
    const [w, h] = [el.clientWidth, el.clientHeight];
    fg.width(w).height(h);
    for (const m of points) m.uniforms.scale.value = h / 2;
    const r = opts.reserveRight?.() ?? 0;
    const camera = cameraOf(fg);
    const clear = r && r < w / 2 ? w - r : w;
    camera.zoom = state.view?.selected ? 1 : clear / w;
    if (clear < w) camera.setViewOffset(w, h, r / 2, 0, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };
}

/** Turn the camera about the orbit centre (yaw, pitch), clear of the poles. */
function orbit(THREE: Ctx['THREE'], offset: Vec3, v: Axes, turn: number) {
  const s = new THREE.Spherical().setFromVector3(offset);
  s.theta += v.yaw * turn;
  s.phi = Math.min(Math.PI - 0.05, Math.max(0.05, s.phi - v.pitch * turn));
  offset.setFromSpherical(s);
}

/** A keyboard step: the axes held, for dt seconds, at `dist` from the orbit centre. */
type Step = { v: Axes; dt: number; dist: number };

/**
 * Sideways and up/down move camera and orbit centre together (a pan); forward closes
 * in on the centre, and pushes it on ahead once near it.
 */
function travel(THREE: Ctx['THREE'], camera: Camera, target: Vec3, { v, dt, dist }: Step) {
  const k = EXPLORER.keys;
  const speed = Math.max(k.moveMin, dist * k.moveRel) * dt;
  const ahead = camera.getWorldDirection(new THREE.Vector3());
  const right = ahead.clone().cross(camera.up).normalize();
  const pan = right.multiplyScalar(v.x * speed).addScaledVector(camera.up, v.y * speed);
  camera.position.add(pan);
  target.add(pan);
  const fwd = v.z * speed;
  camera.position.addScaledVector(ahead, fwd);
  if (dist - fwd < k.near) target.addScaledVector(ahead, k.near - (dist - fwd));
}

export function createCamera(ctx: Ctx, points: PointsMaterial3[]) {
  const { THREE, fg, motion } = ctx;
  swoopIn(ctx);
  const resize = fitter(ctx, points);
  resize();
  window.addEventListener('resize', resize);
  /** The camera glides to a term (a cut under reduced motion). */
  const flyTo = (id: string) => {
    const n = ctx.model.byId.get(id);
    if (n) fg.cameraPosition(viewOf(n), { x: n.x, y: n.y, z: n.z }, motion ? 1200 : 0);
  };
  const nudge = (v: Axes, dt: number) => {
    const camera = cameraOf(fg);
    const target = orbitOf(fg).target;
    const offset = camera.position.clone().sub(target);
    if (v.yaw || v.pitch) {
      orbit(THREE, offset, v, EXPLORER.keys.orbitRad * dt);
      camera.position.copy(target).add(offset);
    }
    travel(THREE, camera, target, { v, dt, dist: offset.length() });
    camera.lookAt(target);
  };
  const destroy = () => window.removeEventListener('resize', resize);
  return { resize, flyTo, nudge, destroy };
}

/** Slow auto-rotation about the scene centre (off under reduced motion). */
export const spinner =
  ({ fg, motion, opts }: Ctx) =>
  (on: boolean) => {
    const controls = orbitOf(fg);
    const spinning = on && motion;
    controls.autoRotate = spinning;
    controls.autoRotateSpeed = EXPLORER.three.spinSpeed;
    if (spinning) opts.onPoint?.(null);
  };

/** A drag (not the wheel): a rotate cursor and a ring while orbiting, a closed hand while panning. */
export function watchDrags({ el, fg, opts }: Ctx) {
  el.style.cursor = 'grab';
  const drag = createDragFeedback(el);
  let press: PointerEvent | null = null;
  const onPress = (e: PointerEvent) => void (press = e);
  const onRelease = () => void (press = null);
  el.addEventListener('pointerdown', onPress, true);
  window.addEventListener('pointerup', onRelease);
  const controls = orbitOf(fg);
  // Orbiting, zooming or panning the camera hides the hover card. The press is seen
  // first, in the capture phase.
  controls.addEventListener('start', () => {
    opts.onPoint?.(null);
    const kind = press && orbitDragKind(press);
    if (press && kind) drag.start(kind, press);
  });
  controls.addEventListener('end', () => drag.end());
  return () => {
    window.removeEventListener('pointerup', onRelease);
    el.removeEventListener('pointerdown', onPress, true);
    drag.destroy();
  };
}
