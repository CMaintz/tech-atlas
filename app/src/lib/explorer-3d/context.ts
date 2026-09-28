/**
 * The 3D map's shared context: three.js, the container, the fixed model, the mutable
 * state, the lens over it, the motion gate and the 3d-force-graph scene. Every part of
 * the map takes this one object rather than a long list of arguments.
 */
import type { ForceGraph3DInstance } from '3d-force-graph';
import { EXPLORER } from '../explorer-config';
import { reducedMotion } from '../graph-cytoscape';
import { createMotionGate, type MotionGate } from '../explorer-focus';
import { buildModel, type Model } from './model';
import { createLens, type Lens } from './lens';
import { createGraph3D, type GraphClass } from './graph3d';
import { inkOf, type Graph3D, type Map3DOptions, type State3, type Three } from './types';

export type Base = {
  THREE: Three;
  el: HTMLElement;
  opts: Map3DOptions;
  model: Model;
  state: State3;
  lens: Lens;
  gate: MotionGate;
  /** False under reduced motion: no swoop, no comets, no auto-rotate, cuts not glides. */
  motion: boolean;
};

export type Ctx = Base & { fg: Graph3D; scene: ReturnType<ForceGraph3DInstance['scene']> };

function baseOf(THREE: Three, opts: Map3DOptions): Base {
  const model = buildModel(opts.graph);
  const state: State3 = {
    theme: opts.theme ?? 'dark',
    view: null,
    fx: { hood: null, preview: null },
    hoverId: null,
    underLink: null,
  };
  const lens = createLens(model.neighbours, state);
  const gate = createMotionGate();
  return { THREE, el: opts.container, opts, model, state, lens, gate, motion: !reducedMotion() };
}

export function createContext(ForceGraph3D: GraphClass, THREE: Three, opts: Map3DOptions): Ctx {
  const base = baseOf(THREE, opts);
  const fg = createGraph3D(ForceGraph3D, base);
  const scene = fg.scene();
  scene.fog = new THREE.FogExp2(inkOf(base).bg3d, EXPLORER.three.fogDensity);
  return { ...base, fg, scene };
}
