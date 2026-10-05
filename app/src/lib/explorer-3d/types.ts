/** The 3D map's shared shapes: its options, the View it shows, and its working state. */
import type { ForceGraph3DInstance } from '3d-force-graph';
import type { Graph, GraphLink, GraphNode } from '../graph-model';
import type { MapTheme } from '../graph-style';
import type { Focus, RelationNames } from '../explorer-focus';

/** three.js, loaded on demand with the map (the type import is erased). */
export type Three = typeof import('three');

export type View3D = {
  nodes: ReadonlySet<string>;
  families: ReadonlySet<string>;
  showAll: boolean;
  selected: string | null;
  highlight: ReadonlySet<string>;
  colour: (n: GraphNode) => string;
  bands: (n: GraphNode) => string[];
};

export type Map3DOptions = {
  container: HTMLElement;
  graph: Graph;
  lang: 'en' | 'da';
  onSelect: (id: string | null) => void;
  /** Pixels on the right covered by an overlay (the open legend). */
  reserveRight?: () => number;
  /** A term is hovered (e.g. to prefetch its panel data). */
  onHover?: (id: string) => void;
  /** The pointer is over a term (screen position in the container), or left it (null). */
  onPoint?: (hit: { id: string; x: number; y: number } | null) => void;
  /** The scene's palette (A92); change it later with `retheme`. */
  theme?: MapTheme;
  /** Each domain's name, written large and faint across its galaxy (A93b). */
  domainLabels?: Record<string, string>;
  /** Relationship names, written on the lit links (A97a); none without. */
  relationNames?: RelationNames;
};

/** A term fixed at its galaxy position (fx/fy/fz pin it for 3d-force-graph). */
export type Node3 = GraphNode & {
  x: number;
  y: number;
  z: number;
  fx: number;
  fy: number;
  fz: number;
};
/** A relationship with its index and whether the overview's backbone holds it. */
export type Link3 = GraphLink & { i: number; bb: boolean };

/** What changes while the map lives: the palette, the View, hover and what it lights. */
export type State3 = {
  theme: MapTheme;
  view: View3D | null;
  /** What hover adds (A97a): a whole neighbourhood with nothing selected, else a preview. */
  fx: Focus;
  /** The hovered term the map shows (hover is gated: never while the map moves). */
  hoverId: string | null;
  /** The link under the pointer: its name shows even where names were culled. */
  underLink: number | null;
};

/** Typed with our node and link shapes, so its accessors and handlers take them. */
export type Graph3D = ForceGraph3DInstance<GraphNode, Link3>;
export type Sprite = InstanceType<Three['Sprite']>;
export type CanvasTexture = InstanceType<Three['CanvasTexture']>;
export type Colour = InstanceType<Three['Color']>;
export type Camera = InstanceType<Three['PerspectiveCamera']>;
export type Vec3 = InstanceType<Three['Vector3']>;

/** The orbit controls, as far as the map drives them. */
export type Orbit = {
  target: Vec3;
  autoRotate: boolean;
  autoRotateSpeed: number;
  zoomToCursor?: boolean;
  addEventListener: (type: string, fn: () => void) => void;
};
