/**
 * Characterization of the 3D map's interaction (no WebGL): hover through the motion
 * gate, clicks, keyboard flight, auto-rotate, the comets' frames, framing and teardown.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EXPLORER } from './explorer-config';
import { STILL } from './explorer-keys';
import { removeFakeDom } from './explorer-3d/testing/fake-dom';
import type { FakeGraph } from './explorer-3d/testing/fake-force-graph';
import { graph, overview, withView } from './explorer-3d/testing/fixture';
import { mountMap3D } from './explorer-3d/testing/mount';
import { paintOf, r3 } from './explorer-3d/testing/probe';

vi.mock('3d-force-graph', async () => {
  const { FakeForceGraph3D } = await import('./explorer-3d/testing/fake-force-graph');
  return { default: FakeForceGraph3D };
});
const drag = { start: vi.fn(), end: vi.fn(), destroy: vi.fn() };
vi.mock('./drag-feedback', () => ({
  createDragFeedback: () => drag,
  orbitDragKind: () => 'orbit',
}));

afterEach(removeFakeDom);

const render = (fg: FakeGraph) =>
  fg.scene.onBeforeRender(...([] as unknown as Parameters<typeof fg.scene.onBeforeRender>));
const handler = (fg: FakeGraph, name: string) => fg.store.get(name) as (x: unknown) => void;
const nodeOf = (fg: FakeGraph, id: string) =>
  (fg.store.get('graphData') as { nodes: { id: string }[] }).nodes.find((n) => n.id === id);

/** Mount, let the camera settle and the pointer move, so hover is let through. */
async function settled(opts = {}) {
  const m = await mountMap3D(opts);
  m.map.apply(overview);
  render(m.fg);
  vi.runAllTimers(); // the intro swoop moves the camera once more
  render(m.fg);
  render(m.fg);
  m.el.listeners.pointermove();
  return m;
}

describe('createMap3D hover', () => {
  it('lights a hovered neighbourhood after the hover delay', async () => {
    const { fg, map, calls, el } = await settled();
    handler(fg, 'onNodeHover')(nodeOf(fg, 'cs/tcp'));
    expect(calls.hover).toHaveBeenLastCalledWith('cs/tcp');
    expect(calls.point.mock.lastCall?.[0]).toMatchObject({ id: 'cs/tcp' });
    expect(el.style.cursor).toBe('pointer');
    vi.advanceTimersByTime(EXPLORER.hoverDelayMs);
    render(fg);
    expect(paintOf(map, fg)).toMatchSnapshot();
  });
  it('previews a hovered term over a selection', async () => {
    const { fg, map } = await settled();
    map.apply(withView({ selected: 'security/firewall' }));
    handler(fg, 'onNodeHover')(nodeOf(fg, 'cs/kernel'));
    vi.advanceTimersByTime(EXPLORER.hoverDelayMs);
    expect(graph.nodes.map((n) => map.lab.faded(n.id))).toMatchSnapshot();
  });
  it('drops the hover as soon as the camera moves', async () => {
    const { fg, map, calls, el } = await settled();
    handler(fg, 'onNodeHover')(nodeOf(fg, 'cs/tcp'));
    vi.advanceTimersByTime(EXPLORER.hoverDelayMs);
    fg.camera.position.x += 50;
    render(fg);
    vi.runAllTimers();
    expect(calls.point).toHaveBeenLastCalledWith(null);
    expect(graph.nodes.map((n) => map.lab.faded(n.id)).some(Boolean)).toBe(false);
    handler(fg, 'onNodeHover')(null);
    render(fg);
    el.listeners.pointermove();
    expect(el.style.cursor).toBe('grab');
  });
  it('shows the name of the link under the pointer first', async () => {
    const { fg, map } = await settled();
    map.apply(withView({ selected: 'security/threat' }));
    const links = (fg.store.get('graphData') as { links: unknown[] }).links;
    handler(fg, 'onLinkHover')(links[4]);
    render(fg);
    expect(paintOf(map, fg).sprites.filter((s) => s.center[1] < 0)).toMatchSnapshot();
  });
});

describe('createMap3D clicks and camera', () => {
  it('selects a clicked term and clears on the background', async () => {
    const { fg, calls } = await mountMap3D();
    handler(fg, 'onNodeClick')(nodeOf(fg, 'cs/ip'));
    handler(fg, 'onBackgroundClick')(undefined);
    expect(calls.select.mock.calls).toEqual([['cs/ip'], [null]]);
  });
  it('flies on the keys: orbit, pan and forward', async () => {
    const { fg, map } = await mountMap3D();
    fg.camera.position.set(0, 100, 500);
    fg.camera.lookAt(0, 0, 0);
    map.nudge({ x: 1, y: 0.5, z: 1, zoom: 0, yaw: 0.3, pitch: 0.2 }, 0.5);
    map.nudge({ ...STILL, z: 1 }, 4);
    expect(
      r3([...fg.camera.position.toArray(), ...fg.controls.target.toArray()]),
    ).toMatchSnapshot();
  });
  it('swoops in, and focuses a term on request', async () => {
    const { fg, map } = await mountMap3D();
    vi.runAllTimers();
    map.focus('security/mfa');
    map.focus('nope');
    expect(fg.moves.map((m) => JSON.stringify(m))).toMatchSnapshot();
  });
  it('auto-rotates and hides the hover card while it does', async () => {
    const { fg, map, calls } = await mountMap3D();
    map.spin(true);
    expect([fg.controls.autoRotate, fg.controls.autoRotateSpeed]).toEqual([true, 0.35]);
    expect(calls.point).toHaveBeenLastCalledWith(null);
    map.spin(false);
    expect(fg.controls.autoRotate).toBe(false);
  });
  it('frames the part of the canvas the legend leaves clear', async () => {
    const { fg, map } = await mountMap3D({ reserveRight: 200 });
    expect([fg.camera.zoom, fg.camera.view?.offsetX]).toEqual([0.75, 100]);
    map.apply(withView({ selected: 'cs/ip' }));
    map.reframe();
    expect(fg.camera.zoom).toBe(1);
    expect(fg.controls.zoomToCursor).toBe(true);
  });
  it('starts a drag ring when the controls start from a press', async () => {
    const { fg, el, calls } = await mountMap3D();
    el.listeners.pointerdown({ button: 0 });
    fg.controls.listeners.start();
    fg.controls.listeners.end();
    expect(drag.start).toHaveBeenCalledWith('orbit', { button: 0 });
    expect(drag.end).toHaveBeenCalled();
    expect(calls.point).toHaveBeenLastCalledWith(null);
  });
});

describe('createMap3D motion', () => {
  it('reveals switched-on links a batch per frame, and moves the comets', async () => {
    const { fg, map, dom } = await mountMap3D();
    map.apply(overview);
    map.apply(withView({ showAll: true }));
    dom.runFrames(5000);
    expect(paintOf(map, fg).web).toMatchSnapshot();
    expect(paintOf(map, fg).flow.positions).toMatchSnapshot();
  });
  it('holds still under reduced motion', async () => {
    const { fg, map, dom } = await mountMap3D({ reduced: true });
    map.apply(overview);
    map.apply(withView({ showAll: true }));
    expect(dom.frames.size).toBe(0);
    expect(map.lab.flow.visible).toBe(false);
    map.spin(true);
    map.focus('cs/ip');
    expect(fg.controls.autoRotate).toBe(false);
    expect(fg.moves.map((m) => m[2])).toEqual([undefined, 0]);
  });
  it('pauses when hidden and tears down', async () => {
    const { fg, map, dom, el } = await mountMap3D();
    map.show(false);
    expect([fg.calls.pauseAnimation, dom.frames.size]).toEqual([1, 0]);
    map.show(true);
    expect([fg.calls.resumeAnimation, dom.frames.size]).toEqual([1, 1]);
    map.destroy();
    expect([fg.calls._destructor, dom.frames.size, el.innerHTML]).toEqual([1, 0, '']);
    expect(el.removed).toEqual(['pointermove', 'pointerdown']);
    expect(dom.win.removeEventListener.mock.calls.map((c) => c[0])).toEqual([
      'resize',
      'pointerup',
    ]);
    expect(drag.destroy).toHaveBeenCalled();
  });
});
