/**
 * Pure maths for the canvas Explorer lab (A91): a hand-rolled 2D-context renderer with
 * "fake 3D" (the owner's Atlas.dc demo). Layout, minimum spacing, projection, the elastic
 * snap-back spring, the hit-test grid and the edge backbone live under canvas-explorer/ —
 * no DOM, no canvas, deterministic and unit-tested. The components only draw.
 */
export { LAB, type Vec3 } from './canvas-explorer/config';
export { domainOrder, labLayout, radii } from './canvas-explorer/layout';
export { minClearance, spaceOut } from './canvas-explorer/spacing';
export { project, type Camera, type Projected } from './canvas-explorer/projection';
export { phaseOf, pulseAt, springAtRest, springStep } from './canvas-explorer/motion';
export { HitGrid } from './canvas-explorer/hit-grid';
export { labBackbone } from './canvas-explorer/edges';
export { searchTerms } from './canvas-explorer/search';
