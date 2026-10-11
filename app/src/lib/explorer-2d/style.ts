/**
 * The 2D map's own stylesheet rules, layered over the shared `graphStyle`: the
 * resting backbone, revealed edges, bundles, label culling, tags, hover and selection,
 * and relationship names. The order matters (later rules win; the lab appends its own).
 */
import type cytoscape from 'cytoscape';
import { EXPLORER } from '../explorer-config';
import { MAP_INK, type MapTheme } from '../graph-style';
import { graphStyle } from '../graph-cytoscape';

type Rule = { selector: string; style: Record<string, string | number> };

const HIDDEN: Rule[] = [
  // Cytoscape's own press marker is a dark disc, invisible on the night map: the drag
  // ring (drag-feedback.ts) replaces it.
  { selector: 'core', style: { 'active-bg-opacity': 0 } },
  { selector: '.gone', style: { display: 'none' } },
  { selector: 'edge.off', style: { display: 'none' } },
];

const EDGES: Rule[] = [
  // Resting backbone: the cluster's own shade, no arrow, straight and solid — a calm
  // constellation, and the cheapest edges Cytoscape draws (haystack), so ~950 of them
  // still pan smoothly.
  {
    selector: 'edge.bb',
    style: {
      'line-color': 'data(tint)',
      'line-fill': 'solid',
      'target-arrow-shape': 'none',
      'curve-style': 'haystack',
      'haystack-radius': 0,
    },
  },
  // Resting edges between islands are quieter.
  { selector: 'edge.bb.xc', style: { opacity: EXPLORER.edges.crossAlpha } },
  // Revealed (hover, selection, route, "show all"): family colour, curve and arrow.
  {
    selector: 'edge.all, edge.lit, edge.hl, edge.focus',
    style: {
      'line-color': 'data(colour)',
      'target-arrow-color': 'data(colour)',
      'target-arrow-shape': 'data(arrow)',
      'curve-style': 'bezier',
      'control-point-step-size': 30,
    },
  },
  {
    selector: 'edge[?cross].all, edge[?cross].lit, edge[?cross].hl, edge[?cross].focus',
    style: { 'line-fill': 'linear-gradient' },
  },
  { selector: 'edge.all', style: { opacity: EXPLORER.edges.allAlpha } },
  { selector: 'edge.focus', style: { opacity: 0.9, 'z-index': 18 } },
];

const BUNDLES: Rule[] = [
  {
    selector: 'edge.bundle',
    style: {
      width: 'data(width)',
      opacity: 'data(alpha)',
      'line-fill': 'linear-gradient',
      'line-gradient-stop-colors': 'data(gradient)',
      'line-gradient-stop-positions': '0 100',
      'target-arrow-shape': 'none',
      'curve-style': 'unbundled-bezier',
      'control-point-distances': 'data(curve)',
      'control-point-weights': 0.5,
      'line-cap': 'round',
      events: 'no',
      'z-index': 0,
    },
  },
  { selector: 'edge.bundle.faded', style: { opacity: 0.02 } },
  { selector: 'edge.bundle.near', style: { display: 'none' } },
  {
    selector: 'node.anchor',
    style: { width: 1, height: 1, 'background-opacity': 0, label: '', events: 'no' },
  },
];

const TERM_LABELS: Rule[] = [
  { selector: 'node.far', style: { 'font-size': 'data(farFont)' } },
  { selector: 'node.far[farFont = 0]', style: { 'text-opacity': 0 } },
  { selector: 'node[size]', style: { 'min-zoomed-font-size': 0 } },
  { selector: 'node.nolabel', style: { 'text-opacity': 0 } },
  {
    selector: 'node.far.lit, node.far.sel, node.far.hl',
    style: { 'text-opacity': 1, 'font-size': 'data(hoverFont)' },
  },
  {
    selector: 'node.nolabel.lit, node.nolabel.sel, node.nolabel.hl',
    style: { 'text-opacity': 1 },
  },
  { selector: 'node.hoverhide', style: { 'text-opacity': 0 } },
];

/** A tag is a label with no node under it. */
const TAG_BOX = {
  'background-opacity': 0,
  'border-width': 0,
  'underlay-opacity': 0,
  width: 1,
  height: 1,
};

const tagText = (theme: MapTheme) => ({
  label: 'data(label)',
  color: 'data(colour)',
  'font-size': 'data(font)',
  'font-weight': 600,
  'text-valign': 'data(valign)',
  'text-halign': 'data(halign)',
  'text-opacity': 0.8,
  'text-outline-color': MAP_INK[theme].halo,
  'text-outline-width': 3,
  'text-outline-opacity': 0.85,
  'min-zoomed-font-size': 6,
});

const tagRules = (theme: MapTheme): Rule[] => [
  { selector: 'node.tag', style: { ...TAG_BOX, ...tagText(theme), 'z-index': 0, events: 'no' } },
  { selector: 'node.tag.domain', style: { 'text-opacity': 0.45, 'text-outline-width': 0 } },
  {
    selector: 'node.tag.tick',
    style: { 'text-opacity': theme === 'light' ? 1 : 0.35, 'font-weight': 400 },
  },
  { selector: 'node.tag.faded', style: { 'text-opacity': 0.08 } },
];

const FOCUS: Rule[] = [
  // Hover previews the selection look, lighter.
  { selector: 'node.faded', style: { opacity: 0.35, 'text-opacity': 0, 'underlay-opacity': 0 } },
  { selector: 'edge.faded', style: { opacity: 0.08 } },
  // Selection (and a route): everything not connected recedes — nodes, labels, edges,
  // bundles and names — while the term, its neighbours and their edges stay fully lit.
  { selector: 'node.dim', style: { opacity: 0.14, 'text-opacity': 0, 'underlay-opacity': 0 } },
  { selector: 'edge.dim', style: { opacity: 0.05 } },
  { selector: 'edge.bundle.dim', style: { opacity: 0.02 } },
  { selector: 'node.tag.dim', style: { opacity: 1, 'text-opacity': 0.08 } },
  {
    selector: 'node.nb',
    style: { 'text-opacity': 1, 'min-zoomed-font-size': 0, 'z-index': 20 },
  },
  { selector: 'node.far.nb', style: { 'font-size': 'data(hoverFont)' } },
  // A term hovered over a selection or route: it and its link to the selection
  // come forward; the selection's look stays.
  {
    selector: 'node.pv',
    style: { opacity: 1, 'text-opacity': 1, 'min-zoomed-font-size': 0, 'z-index': 21 },
  },
  { selector: 'edge.pv', style: { opacity: 1, 'z-index': 19 } },
];

/** Relationship names on the lit links, upright along the line, just above it. */
const relationNameRule = (theme: MapTheme): Rule => ({
  selector: 'edge.rl, edge.rlh',
  style: {
    label: 'data(rel)',
    'font-size': 'data(relFont)',
    'font-weight': 500,
    color: MAP_INK[theme].label,
    'text-opacity': 1,
    'text-rotation': 'autorotate',
    'text-margin-y': -6,
    'text-outline-color': MAP_INK[theme].halo,
    'text-outline-width': 2,
    'text-outline-opacity': 0.9,
    'min-zoomed-font-size': 0,
  },
});

/** The 2D map's rules on top of the shared look, in cascade order. */
export const extraStyle = (theme: MapTheme): Rule[] => [
  ...HIDDEN,
  ...EDGES,
  ...BUNDLES,
  ...TERM_LABELS,
  ...tagRules(theme),
  ...FOCUS,
  relationNameRule(theme),
];

/**
 * v2 only, last so they win: lit names draw over every other term, neighbours' names
 * that would overlap give way, and cluster names take the pointer (on their text).
 */
const V2: Rule[] = [
  { selector: 'node.lit, node.sel', style: { 'z-index': 20 } },
  { selector: 'node.nbhide', style: { 'text-opacity': 0 } },
  { selector: 'node.nbhide.pv', style: { 'text-opacity': 1 } },
  { selector: 'node.tag[id ^= "tag:c:"]', style: { events: 'yes', 'text-events': 'yes' } },
  { selector: 'node.tag.named', style: { 'text-opacity': 1 } },
];

/** The whole 2D stylesheet for a palette (and the v2 rules, for that variant). */
export const mapStylesheet = (theme: MapTheme, variant?: 'v2') =>
  [
    ...(graphStyle(theme) as unknown[]),
    ...extraStyle(theme),
    ...(variant === 'v2' ? V2 : []),
  ] as cytoscape.StylesheetJson;
