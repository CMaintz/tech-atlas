/**
 * Characterization of the 3D map's painting (no WebGL): 3d-force-graph is faked, three.js
 * is real. Snapshots pin what each view draws — accessors, glow, web, comets, sprites.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { EXPLORER } from './explorer-config';
import type { FakeGraph } from './explorer-3d/testing/fake-force-graph';
import { removeFakeDom } from './explorer-3d/testing/fake-dom';
import { graph, overview, withView } from './explorer-3d/testing/fixture';
import { mountMap3D } from './explorer-3d/testing/mount';
import { paintOf, r3 } from './explorer-3d/testing/probe';

vi.mock('3d-force-graph', async () => {
  const { FakeForceGraph3D } = await import('./explorer-3d/testing/fake-force-graph');
  return { default: FakeForceGraph3D };
});
vi.mock('./drag-feedback', () => ({
  createDragFeedback: () => ({ start: vi.fn(), end: vi.fn(), destroy: vi.fn() }),
  orbitDragKind: () => 'orbit',
}));

afterEach(removeFakeDom);

describe('createMap3D layout', () => {
  it('fixes every term at its galaxy position', async () => {
    const { fg, map } = await mountMap3D();
    const data = fg.store.get('graphData') as {
      nodes: { id: string; x: number; y: number; z: number; fx: number }[];
    };
    expect(data.nodes.map((n) => [n.id, ...r3([n.x, n.y, n.z, n.fx])])).toMatchSnapshot();
    expect(r3(map.lab.curve)).toMatchSnapshot();
    expect(r3(map.lab.linkLength)).toMatchSnapshot();
  });
});

describe('createMap3D paint', () => {
  it('paints the overview', async () => {
    const { fg, map } = await mountMap3D();
    map.apply(overview);
    expect(paintOf(map, fg)).toMatchSnapshot();
  });
  it('paints the overview with every link shown', async () => {
    const { fg, map } = await mountMap3D();
    map.apply(overview);
    map.apply(withView({ showAll: true }));
    expect(paintOf(map, fg)).toMatchSnapshot();
  });
  it('paints a selection and flies to it', async () => {
    const { fg, map } = await mountMap3D();
    map.apply(overview);
    map.apply(withView({ selected: 'security/firewall' }));
    fg.scene.onBeforeRender(...([] as unknown as Parameters<typeof fg.scene.onBeforeRender>));
    expect(paintOf(map, fg)).toMatchSnapshot();
    expect(fg.moves.map((m) => JSON.stringify(m))).toMatchSnapshot();
    expect(r3([fg.camera.zoom])).toEqual([1]);
  });
  it('paints a highlighted route', async () => {
    const { fg, map } = await mountMap3D();
    const route = new Set(['security/mfa', 'security/threat', 'security/cia']);
    map.apply(withView({ highlight: route }));
    expect(paintOf(map, fg)).toMatchSnapshot();
  });
  it('paints a filtered map: one family, some terms hidden', async () => {
    const { fg, map } = await mountMap3D();
    const nodes = new Set(['security/firewall', 'cs/tcp', 'cs/ip', 'security/threat']);
    map.apply(withView({ nodes, families: new Set(['dependency']) }));
    expect(paintOf(map, fg)).toMatchSnapshot();
  });
  it('reports what the lab reads', async () => {
    const { map, fg } = await mountMap3D();
    map.apply(withView({ selected: 'cs/tcp' }));
    const links = (fg.store.get('graphData') as { links: never[] }).links;
    const ids = ['security/cia', 'cs/tcp', 'cs/ip', 'cs/process'];
    expect(links.map((l) => [map.lab.drawn(l), map.lab.focusOf(l)])).toMatchSnapshot();
    expect(ids.map(map.lab.faded)).toMatchSnapshot();
    expect(ids.map((id) => r3([map.lab.radius({ id } as never)])[0])).toMatchSnapshot();
    expect([...map.lab.labels.keys()]).toMatchSnapshot();
  });
});

describe('createMap3D theme', () => {
  it('repaints for the cream map', async () => {
    const { fg, map } = await mountMap3D();
    map.apply(withView({ selected: 'security/firewall' }));
    map.retheme('light');
    map.apply(withView({ selected: 'security/firewall' }));
    expect(paintOf(map, fg)).toMatchSnapshot();
  });
  it('starts on the cream map when asked', async () => {
    const { fg, map } = await mountMap3D({ theme: 'light' });
    map.apply(overview);
    expect(paintOf(map, fg)).toMatchSnapshot();
  });
  it('ignores a switch to the theme it already has', async () => {
    const { fg, map } = await mountMap3D();
    map.apply(overview);
    const reheats = fg.calls.d3ReheatSimulation;
    map.retheme('dark');
    expect(fg.calls.d3ReheatSimulation).toBe(reheats);
  });
});

const render = (fg: FakeGraph) =>
  fg.scene.onBeforeRender(...([] as unknown as Parameters<typeof fg.scene.onBeforeRender>));
type Placed = { id: string; cluster: string; x: number; y: number; z: number };
const nodesOf = (fg: FakeGraph) => (fg.store.get('graphData') as { nodes: Placed[] }).nodes;

async function settled() {
  const m = await mountMap3D({ variant: 'v2' });
  m.map.apply(overview);
  render(m.fg);
  vi.runAllTimers();
  render(m.fg);
  render(m.fg);
  m.el.listeners.pointermove({ clientX: -1, clientY: -1, buttons: 0 });
  return m;
}

/** Where a cluster's name lands on the fake 800 x 600 screen. */
function nameOnScreen(fg: FakeGraph, cluster: string) {
  const own = nodesOf(fg).filter((n) => n.cluster === cluster);
  const mid = (k: 'x' | 'z') => own.reduce((s, n) => s + n[k], 0) / own.length;
  const top = Math.max(...own.map((n) => n.y)) + EXPLORER.v2.clusterLabelHeight;
  const at = new THREE.Vector3(mid('x'), top, mid('z')).project(fg.camera);
  return { clientX: ((at.x + 1) / 2) * 800, clientY: ((1 - at.y) / 2) * 600, buttons: 0 };
}

describe('createMap3D v2 (the next Explorer lab)', () => {
  it('names no term at rest and writes a name over every cluster', async () => {
    const { map, fg } = await settled();
    expect(map.lab.labels.size).toBe(0);
    const sprites = fg.scene.children.filter((o) => o instanceof THREE.Sprite && o.visible);
    const clusters = new Set(graph.nodes.map((n) => n.cluster)).size;
    expect(sprites.length).toBe(clusters + new Set(graph.nodes.map((n) => n.domain[0])).size);
  });
  it('a hovered cluster name recedes everything outside its cluster', async () => {
    const { map, fg, el } = await settled();
    el.listeners.pointermove(nameOnScreen(fg, 'networking'));
    vi.advanceTimersByTime(EXPLORER.hoverDelayMs);
    expect(map.lab.faded('cs/tcp')).toBe(false);
    expect(map.lab.faded('cs/kernel')).toBe(true);
    el.listeners.pointermove({ clientX: -1, clientY: -1, buttons: 0 });
    expect(map.lab.faded('cs/kernel')).toBe(false);
  });
  it('a click on a cluster name frames the cluster instead of clearing the selection', async () => {
    const { fg, el, calls } = await settled();
    el.listeners.pointermove(nameOnScreen(fg, 'os'));
    const before = fg.moves.length;
    (fg.store.get('onBackgroundClick') as () => void)();
    expect(fg.moves.length).toBe(before + 1);
    expect(calls.select).not.toHaveBeenCalled();
  });
});
