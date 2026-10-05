/**
 * The Cytoscape stylesheet shared by the Explorer and the term-page graph. Rule
 * order is the cascade: base node and edge looks first, then hover, then highlight and
 * selection, each overriding what came before.
 */
import type cytoscape from 'cytoscape';
import { FLOW_DASH, MAP_INK, type MapTheme } from '../graph-style';

type Ink = (typeof MAP_INK)[MapTheme];
/** Scales a night-map underlay opacity to the theme's. */
type Underlay = (alpha: number) => number;

/**
 * Underlay opacities are tuned for the night map's glow; the cream map's soft shadow
 * scales them down.
 */
const underlayScale =
  (ink: Ink): Underlay =>
  (a) =>
    +((a * ink.underlayAlpha) / MAP_INK.dark.underlayAlpha).toFixed(3);

/** A term: a filled disc with its label below, haloed so it reads over edges. */
const NODE_LOOK = {
  'background-color': 'data(colour)',
  width: 'data(size)',
  height: 'data(size)',
  label: 'data(label)',
  'font-size': 'data(font)',
  'text-valign': 'bottom',
  'text-margin-y': 4,
  'text-outline-width': 2,
  'text-outline-opacity': 0.9,
  'min-zoomed-font-size': 8,
  'underlay-padding': 5,
  'underlay-shape': 'ellipse',
};

/** The term look in a theme's ink. */
const nodeRule = (ink: Ink, u: Underlay) => ({
  selector: 'node[size]',
  style: {
    ...NODE_LOOK,
    color: ink.label,
    'text-outline-color': ink.halo,
    // A glow in the node's own colour on the night map; a soft shadow on the cream one.
    'underlay-color': ink.underlay ?? 'data(colour)',
    'underlay-opacity': u(0.2),
  },
});

/** Domain rings and the edge looks: the same in every theme. */
const EDGE_RULES = [
  // A term in several domains: a solid fill in its own shade and a thin ring in the
  // other domain's colour (the split fill is left to the canvas lab).
  {
    selector: 'node[ring]',
    style: { 'border-width': 2, 'border-color': 'data(ring)', 'border-opacity': 0.95 },
  },
  {
    selector: 'edge',
    style: {
      width: 'data(width)',
      'line-color': 'data(colour)',
      'target-arrow-color': 'data(colour)',
      'target-arrow-shape': 'data(arrow)',
      'arrow-scale': 0.8,
      'curve-style': 'unbundled-bezier',
      'control-point-distances': 'data(curve)',
      'control-point-weights': 0.5,
      'line-cap': 'round',
      opacity: 'data(alpha)',
    },
  },
  // Edges that bridge two domains fade from one domain's colour to the other's.
  {
    selector: 'edge[?cross]',
    style: {
      'line-fill': 'linear-gradient',
      'line-gradient-stop-colors': 'data(gradient)',
      'line-gradient-stop-positions': '0 50 100',
    },
  },
  {
    selector: 'edge.flow, edge.hflow',
    style: { 'line-style': 'dashed', 'line-dash-pattern': FLOW_DASH, opacity: 0.95 },
  },
];

/** Hover: the neighbourhood stays lit, everything else fades back. */
const hoverRules = (u: Underlay) => [
  { selector: 'node.faded', style: { opacity: 0.1, 'text-opacity': 0, 'underlay-opacity': 0 } },
  { selector: 'edge.faded', style: { opacity: 0.04 } },
  {
    selector: 'node.lit',
    style: {
      'underlay-opacity': u(0.45),
      'underlay-padding': 9,
      'min-zoomed-font-size': 0,
      'z-index': 20,
    },
  },
  { selector: 'edge.lit', style: { opacity: 0.95, 'z-index': 19 } },
];

/** Route / prerequisite highlight and selection (Explorer). */
const highlightRules = (ink: Ink, u: Underlay) => [
  { selector: '.dim', style: { opacity: 0.1 } },
  { selector: 'node.hl', style: { 'underlay-opacity': u(0.5), 'underlay-padding': 8 } },
  { selector: 'edge.hl', style: { opacity: 1, width: 3 } },
  {
    selector: 'node.sel',
    style: {
      'outline-width': 3,
      'outline-color': ink.selected,
      'outline-offset': 3,
      'underlay-opacity': u(0.55),
      'underlay-padding': 10,
      'min-zoomed-font-size': 0,
    },
  },
];

/**
 * The shared look: glowing nodes, domain rings, curved family-coloured edges. No style
 * transitions here: on the full map they animate every restyled element each frame;
 * small graphs add `FADE_TRANSITIONS`.
 */
export const graphStyle = (theme: MapTheme = 'dark') => {
  const ink = MAP_INK[theme];
  const u = underlayScale(ink);
  return [
    nodeRule(ink, u),
    ...EDGE_RULES,
    ...hoverRules(u),
    ...highlightRules(ink, u),
  ] as unknown as cytoscape.StylesheetJson;
};

/** The night map's stylesheet (the default). */
export const GRAPH_STYLE = graphStyle('dark');

/** Soft fades for small graphs (the term page), where restyling is cheap. */
export const FADE_TRANSITIONS = [
  {
    selector: 'node[size]',
    style: {
      'transition-property': 'opacity, underlay-opacity, underlay-padding, text-opacity',
      'transition-duration': '0.18s',
    },
  },
  { selector: 'edge', style: { 'transition-property': 'opacity', 'transition-duration': '0.18s' } },
] as unknown as cytoscape.StylesheetJson;
