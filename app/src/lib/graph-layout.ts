/**
 * Pure graph maths for the Explorer (A86): the domain filter, which edges form the
 * overview backbone, PageRank for node size, cluster-to-cluster bundles, the "By depth"
 * and "By time" layouts, map orientation, overlap removal and the 3D galaxy layout.
 * No DOM, no Cytoscape, no three.js — everything here is deterministic and unit-tested.
 *
 * The implementation lives in `graph-layout/`, one module per concern; this module is
 * the public surface every caller imports.
 */
export {
  domainBands,
  effectiveHome,
  effectivePaint,
  linkVisible,
  termVisible,
} from './graph-layout/visibility';
export { OVERVIEW_FAMILIES, backbone, backboneOf } from './graph-layout/backbone';
export { pageRank, sizeForRank } from './graph-layout/centrality';
export {
  bundleControls,
  clusterBundles,
  pairKey,
  relativeControls,
  visibleBundleCounts,
} from './graph-layout/bundles';
export { levelAngle, rotateAbout } from './graph-layout/orientation';
export { separate } from './graph-layout/separate';
export type { LaneLayout } from './graph-layout/lanes';
export { depthLanes } from './graph-layout/depth-lanes';
export { timeLanes, yearX } from './graph-layout/time-lanes';
export type { Point3 } from './graph-layout/galaxy-forces';
export { galaxyLayout } from './graph-layout/galaxy';
