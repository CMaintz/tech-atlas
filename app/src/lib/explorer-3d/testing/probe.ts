/**
 * Reads everything the 3D map painted into plain, rounded data for snapshots: the
 * accessors it gave 3d-force-graph, its own buffers (glow, web, comets) and sprites.
 */
import type * as THREE from 'three';
import type { GraphLink, GraphNode } from '../../graph-model';
import type { Map3D } from '../../explorer-3d';
import type { FakeGraph } from './fake-force-graph';
import type { FakeCanvas } from './fake-dom';

/** Rounded to 3 places, without negative zeros, so snapshots are stable. */
export const r3 = (xs: ArrayLike<number>) =>
  Array.from(xs, (x) => Math.round(x * 1000) / 1000 || 0);

type Accessor<T> = (x: T) => unknown;

function accessors(fg: FakeGraph) {
  const nodes = (fg.store.get('graphData') as { nodes: GraphNode[] }).nodes;
  const links = (fg.store.get('graphData') as { links: GraphLink[] }).links;
  const perNode = (k: string) => nodes.map(fg.store.get(k) as Accessor<GraphNode>);
  const perLink = (k: string) => links.map(fg.store.get(k) as Accessor<GraphLink>);
  return {
    nodeColor: perNode('nodeColor'),
    nodeVisibility: perNode('nodeVisibility'),
    linkVisibility: perLink('linkVisibility'),
    linkColor: perLink('linkColor'),
    arrows: perLink('linkDirectionalArrowLength'),
  };
}

type Geometry = InstanceType<typeof THREE.BufferGeometry>;
type Attribute = InstanceType<typeof THREE.BufferAttribute>;
const attr = (g: Geometry, name: string) => [...(g.getAttribute(name) as Attribute).array];

/** A link's web colour is the same on all its vertices: one triple per link. */
function webColours(g: Geometry, segments: number) {
  const col = attr(g, 'color');
  const per = segments * 2 * 3;
  return Array.from({ length: col.length / per }, (_, i) => r3(col.slice(i * per, i * per + 3)));
}

function flow(g: Geometry) {
  const n = g.drawRange.count;
  return {
    count: n,
    colours: r3(attr(g, 'color').slice(0, n * 3)),
    sizes: r3(attr(g, 'size').slice(0, n)),
    positions: r3(attr(g, 'position').slice(0, n * 3)),
  };
}

type Sprite = InstanceType<typeof THREE.Sprite>;

function sprite(s: Sprite) {
  const image = s.material.map?.image as FakeCanvas | undefined;
  return {
    visible: s.visible,
    opacity: r3([s.material.opacity])[0],
    at: r3(s.position.toArray()),
    scale: r3(s.scale.toArray()),
    center: r3(s.center.toArray()),
    order: s.renderOrder,
    art: image ? [image.width, image.height, ...image.ops.slice(-2)] : null,
  };
}

/** Everything the map shows, as data. */
export function paintOf(map: Map3D, fg: FakeGraph) {
  const L = map.lab;
  const sprites = fg.scene.children.filter((o): o is Sprite => (o as Sprite).isSprite);
  return {
    ...accessors(fg),
    glow: r3(attr(L.glow.geometry, 'color')),
    web: webColours(L.web.geometry, 8),
    flow: flow(L.flow.geometry),
    sprites: sprites.map(sprite),
    background: fg.store.get('backgroundColor'),
    fog: (fg.scene.fog as InstanceType<typeof THREE.FogExp2>).color.getHexString(),
    blending: [L.glowMat.blending, L.flowMat.blending, L.web.material.blending],
    uniforms: r3([L.glowMat.uniforms.light.value, L.glowMat.uniforms.opacity.value]),
  };
}
