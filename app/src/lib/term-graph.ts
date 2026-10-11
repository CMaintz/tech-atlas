import type cytoscape from 'cytoscape';
import type { EdgeType } from '../schema';
import type { Family } from './graph-model';
import { FAMILY_COLOURS, MAP_INK, nodePaint, type MapTheme } from './graph-style';
import { domainBands } from './graph-layout';
import { FADE_TRANSITIONS, edgeData, graphStyle } from './graph-cytoscape';

export type GNode = {
  id: string;
  label: string;
  focus: boolean;
  domain: string[];
  cluster: string;
};
export type GEdge = {
  source: string;
  target: string;
  type: EdgeType;
  family: Family;
  label: string;
};

const focalTermStyle = (theme: MapTheme) => ({
  selector: 'node[focus = 1]',
  style: {
    'outline-width': 2,
    'outline-color': MAP_INK[theme].selected,
    'outline-offset': 3,
    'underlay-opacity': theme === 'light' ? 0.3 : 0.4,
    'underlay-padding': 9,
    'text-valign': 'top',
    'text-margin-y': -6,
    'font-weight': 600,
  },
});

const hoverLabelledEdgeStyle = (theme: MapTheme) => ({
  selector: 'edge',
  style: {
    label: 'data(label)',
    'font-size': 7,
    color: MAP_INK[theme].tick,
    'text-rotation': 'autorotate',
    'text-outline-color': MAP_INK[theme].halo,
    'text-outline-width': 2,
    'text-opacity': 0,
    opacity: 0.7,
  },
});

export const termGraphStyle = (theme: MapTheme) =>
  [
    ...(graphStyle(theme) as unknown[]),
    ...(FADE_TRANSITIONS as unknown[]),
    focalTermStyle(theme),
    hoverLabelledEdgeStyle(theme),
    { selector: 'edge.flow', style: { opacity: 0.85 } },
    { selector: 'edge.lit', style: { 'text-opacity': 1, 'font-size': 9 } },
  ] as cytoscape.StylesheetJson;

export function ringOrder(nodes: GNode[], edges: GEdge[], focus: GNode | undefined): GNode[] {
  const familyOf = new Map<string, string>();
  for (const e of edges) {
    const other = e.source === focus?.id ? e.target : e.source;
    if (!familyOf.has(other)) familyOf.set(other, e.family);
  }
  const families = Object.keys(FAMILY_COLOURS);
  const rank = (n: GNode) => families.indexOf(familyOf.get(n.id) ?? '');
  return nodes
    .filter((n) => !n.focus)
    .sort(
      (a, b) =>
        rank(a) - rank(b) || a.cluster.localeCompare(b.cluster) || a.label.localeCompare(b.label),
    );
}

function nodeData(n: GNode, theme: MapTheme) {
  const ring = domainBands(n, undefined, theme)[1];
  return {
    id: n.id,
    label: n.label,
    focus: n.focus ? 1 : 0,
    colour: nodePaint(n, theme).fill,
    ...(ring ? { ring } : {}),
    size: n.focus ? 26 : 15,
    font: n.focus ? 12 : 10,
  };
}

export const edgePaintData = (nodes: GNode[], edges: GEdge[], theme: MapTheme) => {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return edgeData(
    edges,
    (id) => byId.get(id),
    () => 1.6,
    0.5,
    theme,
  );
};

export function termGraphElements(nodes: GNode[], edges: GEdge[], theme: MapTheme) {
  const focus = nodes.find((n) => n.focus);
  const ordered = [...(focus ? [focus] : []), ...ringOrder(nodes, edges, focus)];
  return [
    ...ordered.map((n) => ({ data: nodeData(n, theme) })),
    ...edgePaintData(nodes, edges, theme).map((data, i) => ({
      data: { ...data, label: edges[i].label },
      classes: data.directed ? 'flow' : '',
    })),
  ];
}

const sideFromCentre = (v: number, r: number, [lo, hi]: [string, string]) =>
  v < -0.15 * r ? lo : v > 0.15 * r ? hi : 'center';

export function labelPlacement(dx: number, dy: number) {
  const r = Math.hypot(dx, dy) || 1;
  const h = sideFromCentre(dx, r, ['left', 'right']);
  return {
    'text-halign': h,
    'text-valign': h === 'center' ? sideFromCentre(dy, r, ['top', 'bottom']) : 'center',
    'text-margin-x': h === 'left' ? -4 : h === 'right' ? 4 : 0,
    'text-margin-y': h === 'center' ? (dy < 0 ? -3 : 3) : 0,
  };
}
