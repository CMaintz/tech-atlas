/** Scripted motion for the visual lab's benchmark: a 2D pan and zoom, a 3D orbit. */
import type cytoscape from 'cytoscape';
import type { Map3D } from '../../lib/explorer-3d';

export type Motion = { at: (k: number) => void; done: () => void };

/** Five seconds of panning in a loop while zooming out and in about the centre. */
export function panZoom(cy: cytoscape.Core): Motion {
  const z0 = cy.zoom();
  const p0 = { ...cy.pan() };
  const cx = cy.width() / 2;
  const cyy = cy.height() / 2;
  return {
    at(k) {
      const a = k * Math.PI * 2;
      const zoom = z0 * (1 + 0.6 * Math.sin(a * 2));
      const f = zoom / z0;
      cy.viewport({
        zoom,
        pan: {
          x: cx - (cx - p0.x) * f + 220 * Math.sin(a),
          y: cyy - (cyy - p0.y) * f + 140 * Math.sin(a * 2),
        },
      });
    },
    done: () => void cy.viewport({ zoom: z0, pan: p0 }),
  };
}

type Vec = { x: number; y: number; z: number };
type Camera3 = {
  cameraPosition(pos?: Vec, lookAt?: Vec, ms?: number): Vec & object;
  controls(): { target: Vec };
};

/** One full turn of the camera about the orbit target. */
export function orbit(m: Map3D): Motion {
  const fg = m.lab.fg as unknown as Camera3;
  const c = { ...fg.controls().target };
  const p = fg.cameraPosition();
  const p0 = { x: p.x, y: p.y, z: p.z };
  const r = Math.hypot(p0.x - c.x, p0.z - c.z);
  const a0 = Math.atan2(p0.z - c.z, p0.x - c.x);
  return {
    at(k) {
      const a = a0 + k * Math.PI * 2;
      fg.cameraPosition({ x: c.x + r * Math.cos(a), y: p0.y, z: c.z + r * Math.sin(a) }, c);
    },
    done: () => void fg.cameraPosition(p0, c),
  };
}
