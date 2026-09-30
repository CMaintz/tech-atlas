/**
 * A stand-in for 3d-force-graph in unit tests (no WebGL): every setter stores its value
 * and chains, every getter returns what was stored — enough to read the accessors the
 * map installs back and drive them. The scene, camera and controls are real three.js
 * objects, so projection and camera maths run for real.
 */
import * as THREE from 'three';

type Handler = (...args: never[]) => unknown;
type P3 = { x: number; y: number; z: number };

export type FakeGraph = {
  /** Everything a setter stored, by method name. */
  store: Map<string, unknown>;
  scene: InstanceType<typeof THREE.Scene>;
  camera: InstanceType<typeof THREE.PerspectiveCamera>;
  controls: FakeControls;
  /** Every `cameraPosition(pos, lookAt, ms)` call, in order. */
  moves: unknown[][];
  /** How often each non-accessor method ran (reheat, pause, resume, destructor). */
  calls: Record<string, number>;
};

export type FakeControls = {
  target: InstanceType<typeof THREE.Vector3>;
  autoRotate: boolean;
  autoRotateSpeed: number;
  zoomToCursor?: boolean;
  listeners: Record<string, () => void>;
  addEventListener: (type: string, fn: () => void) => void;
};

/** The graphs the fake constructor built, newest last. */
export const built: FakeGraph[] = [];

function makeControls(): FakeControls {
  const listeners: Record<string, () => void> = {};
  return {
    target: new THREE.Vector3(),
    autoRotate: false,
    autoRotateSpeed: 0,
    listeners,
    addEventListener: (type, fn) => void (listeners[type] = fn),
  };
}

function makeState(): FakeGraph {
  const camera = new THREE.PerspectiveCamera(50, 800 / 600, 1, 100000);
  camera.updateProjectionMatrix();
  return {
    store: new Map(),
    scene: new THREE.Scene(),
    camera,
    controls: makeControls(),
    moves: [],
    calls: {},
  };
}

function specials(s: FakeGraph): Record<string, Handler> {
  const count = (name: string) => () => void (s.calls[name] = (s.calls[name] ?? 0) + 1);
  return {
    scene: () => s.scene,
    camera: () => s.camera,
    controls: () => s.controls,
    graph2ScreenCoords: ((x: number, y: number) => ({ x, y })) as Handler,
    cameraPosition: ((pos: P3, look: P3 | undefined, ms?: number) => {
      s.moves.push([pos, look, ms]);
      s.camera.position.set(pos.x, pos.y, pos.z);
      if (look) s.camera.lookAt(look.x, look.y, look.z);
      s.camera.updateMatrixWorld();
    }) as Handler,
    d3ReheatSimulation: count('d3ReheatSimulation'),
    pauseAnimation: count('pauseAnimation'),
    resumeAnimation: count('resumeAnimation'),
    _destructor: count('_destructor'),
  };
}

/** A chainable accessor proxy over a fresh fake graph. */
function makeGraph() {
  const s = makeState();
  const own = specials(s);
  built.push(s);
  const fg: object = new Proxy(
    {},
    {
      get: (_, key: string) =>
        own[key] ??
        ((...args: unknown[]) => {
          if (!args.length) return s.store.get(key);
          s.store.set(key, args[0]);
          return fg;
        }),
    },
  );
  return fg;
}

/** `new ForceGraph3D(el, opts)` returns the fake graph. */
export function FakeForceGraph3D() {
  return makeGraph();
}
