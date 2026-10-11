import type cytoscape from 'cytoscape';
import type { Map3D } from '../../lib/explorer-3d';

export type Motion = { at: (k: number) => void; done: () => void };

type View2D = { zoom: number; pan: { x: number; y: number } };

export function panZoom(cy: cytoscape.Core): Motion {
  const start: View2D = { zoom: cy.zoom(), pan: { ...cy.pan() } };
  const centre = { x: cy.width() / 2, y: cy.height() / 2 };
  return {
    at: (k) => void cy.viewport(panZoomAt(start, centre, k)),
    done: () => void cy.viewport({ zoom: start.zoom, pan: start.pan }),
  };
}

function panZoomAt(start: View2D, centre: { x: number; y: number }, k: number): View2D {
  const a = k * Math.PI * 2;
  const zoom = start.zoom * (1 + 0.6 * Math.sin(a * 2));
  const f = zoom / start.zoom;
  return {
    zoom,
    pan: {
      x: centre.x - (centre.x - start.pan.x) * f + 220 * Math.sin(a),
      y: centre.y - (centre.y - start.pan.y) * f + 140 * Math.sin(a * 2),
    },
  };
}

type Vec = { x: number; y: number; z: number };
type Camera3 = {
  cameraPosition(pos?: Vec, lookAt?: Vec, ms?: number): Vec & object;
  controls(): { target: Vec };
};

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
