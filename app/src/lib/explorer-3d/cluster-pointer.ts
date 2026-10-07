import { EXPLORER } from '../explorer-config';
import type { ClusterGroup, ClusterNames, ScreenPoint } from './clusters';
import type { Ctx } from './context';
import { cameraOf } from './graph3d';

function flyToFitCluster({ THREE, fg, model, motion }: Ctx, g: ClusterGroup) {
  const at = (p: ClusterGroup['members'][number]) => new THREE.Vector3(p.x, p.y, p.z);
  const c = g.members.reduce((sum, p) => sum.add(at(p)), new THREE.Vector3());
  c.divideScalar(g.members.length);
  const r = Math.max(...g.members.map((p) => c.distanceTo(at(p)) + model.radius(p)));
  const cam = cameraOf(fg);
  const dist = (r / Math.sin((cam.fov * Math.PI) / 360)) * EXPLORER.v2.frameMargin;
  const to = c.clone().addScaledVector(cam.position.clone().sub(c).normalize(), dist);
  fg.cameraPosition({ x: to.x, y: to.y, z: to.z }, { x: c.x, y: c.y, z: c.z }, motion ? 1200 : 0);
}

function mayLight({ gate, state }: Ctx, e: PointerEvent) {
  const v = state.view;
  return gate.open && !state.underTerm && !e.buttons && !!v && !v.selected && !v.highlight.size;
}

function createLitCluster(ctx: Ctx, refresh: () => void) {
  let timer = 0;
  const set = (g: ClusterGroup | null) => {
    window.clearTimeout(timer);
    if ((ctx.state.cluster?.ids ?? null) === (g?.ids ?? null)) return;
    ctx.state.cluster = g && { ids: g.ids, central: g.central };
    refresh();
  };
  const later = (g: ClusterGroup) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => set(g), EXPLORER.hoverDelayMs);
  };
  return { set, later, cancel: () => window.clearTimeout(timer) };
}

type LitCluster = ReturnType<typeof createLitCluster>;

function trackPointer(ctx: Ctx, names: ClusterNames, lit: LitCluster) {
  let at: ScreenPoint = { x: NaN, y: NaN };
  const onMove = (e: PointerEvent) => {
    const box = ctx.el.getBoundingClientRect();
    at = { x: e.clientX - box.left, y: e.clientY - box.top };
    const g = mayLight(ctx, e) ? names.at(at) : null;
    if (g) lit.later(g);
    else lit.set(null);
    if (g || !ctx.state.underTerm) ctx.el.style.cursor = g ? 'pointer' : 'grab';
  };
  ctx.el.addEventListener('pointermove', onMove);
  return { onMove, nameUnder: () => names.at(at) };
}

export function bindClusterPointer(ctx: Ctx, names: ClusterNames, refresh: () => void) {
  const lit = createLitCluster(ctx, refresh);
  const pointer = trackPointer(ctx, names, lit);
  const clickOnNameOrBackground = () => {
    const g = pointer.nameUnder();
    if (g) flyToFitCluster(ctx, g);
    else ctx.opts.onSelect(null);
  };
  ctx.fg.onBackgroundClick(clickOnNameOrBackground);
  const destroy = () => {
    lit.cancel();
    ctx.el.removeEventListener('pointermove', pointer.onMove);
  };
  return { stop: () => lit.set(null), destroy };
}
