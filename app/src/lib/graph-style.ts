/**
 * The graph's visual language, in one place: domain colour families, cluster
 * shades, relationship-family edge colours, which edges are directed, edge curvature,
 * layout distances and the 3D cluster force. Pure — no DOM, no Cytoscape — so the
 * Explorer, the term-page neighbourhood graph, the Timeline and the tests share it.
 *
 * The implementation lives in `graph-style/`, one module per concern; this module is
 * the public surface every caller imports.
 */
export { contrastRatio, hslToHex, hueDistance } from './graph-style/colour';
export { CREAM, MAP_INK, type MapTheme } from './graph-style/theme';
export {
  CLUSTER_COLOURS,
  CLUSTER_DOMAIN,
  CLUSTER_HUE_SPREAD,
  DOMAIN_HUES,
  clusterColour,
  domainColour,
  domainHue,
  homeDomain,
  nodePaint,
  type Paintable,
} from './graph-style/palette';
export { legendDomains } from './graph-style/legend';
export {
  CURVE_BASE,
  CURVE_STEP,
  FAMILY_COLOURS,
  FAMILY_COLOURS_LIGHT,
  FLOW_DASH,
  FLOW_SPEED,
  SYMMETRIC_TYPES,
  curveOffsets,
  edgePaint,
  familyColours,
  flowOffset,
  isCrossDomain,
  isDirected,
  type EdgePaint,
} from './graph-style/edges';
export type { Point } from './graph-style/point';
export {
  DOMAIN_GAP,
  ISLAND_GAP,
  packIslands,
  type Island,
  type IslandLink,
} from './graph-style/islands';
export {
  LABEL_MARGIN,
  cullLabels,
  labelAbove,
  labelBelow,
  outerSide,
  type Box,
} from './graph-style/labels';
export { LAYOUT_SEED, seededRandom, withSeededRandom } from './graph-style/random';
export { clusterForce, idealEdgeLength } from './graph-style/forces';
