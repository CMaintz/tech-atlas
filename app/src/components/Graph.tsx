import { useEffect, useRef, type MutableRef } from 'preact/hooks';
import cytoscape from 'cytoscape';
import { FAMILY_COLOURS, familyColours, nodePaint, type MapTheme } from '../lib/graph-style';
import { domainBands } from '../lib/graph-layout';
import { attachHover, smoothFit, startFlow } from '../lib/graph-cytoscape';
import {
  edgePaintData,
  labelPlacement,
  termGraphElements,
  termGraphStyle,
  type GEdge,
  type GNode,
} from '../lib/term-graph';
import { useTheme } from '../lib/use-theme';
import { useLatest } from '../lib/use-latest';
import GraphLegend from './GraphLegend';

type Dict = Record<string, string>;

interface Props {
  nodes: GNode[];
  edges: GEdge[];
  /** Base URL of term pages; every node links to its page (SPEC §7: the canvas is an index). */
  termBase: string;
  familyLabels: Dict;
  domainLabels: Dict;
  clusterLabels: Dict;
  /** Legend strings (site.ts GRAPH_UI). */
  text: Dict;
  /** When set, a tapped neighbour is handed here instead of opening its page (term panel). */
  onSelect?: (id: string) => void;
}

/**
 * The term page's neighbourhood graph (2D, Cytoscape), in the Explorer's visual
 * language (A74): the focal term at the centre, its neighbours on a ring grouped by
 * relationship family, one-way edges flowing towards what they point at.
 */
export default function Graph({ nodes, edges, termBase, onSelect, ...props }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const select = useLatest(onSelect);
  // The palette follows the page theme live (A92): a restyle in place, never a relayout.
  const theme = useTheme();
  useTermGraph(ref, { nodes, edges, theme }, (id) => {
    if (select.current) select.current(id);
    else window.location.href = `${termBase}${id}/`;
  });
  return (
    <div class="space-y-2">
      <div ref={ref} class="chart-surface h-[360px] w-full rounded border border-border" />
      <TermGraphLegend nodes={nodes} edges={edges} theme={theme} {...props} />
    </div>
  );
}

type LegendProps = Omit<Props, 'termBase' | 'onSelect'> & { theme: MapTheme };

/** The compact legend: the graph's domains and the families its edges belong to. */
function TermGraphLegend({ nodes, edges, theme, ...labels }: LegendProps) {
  const present = new Set(edges.map((e) => e.family));
  return (
    <GraphLegend
      nodes={nodes}
      families={Object.keys(FAMILY_COLOURS).filter((f) => present.has(f as GEdge['family']))}
      familyColours={familyColours(theme)}
      {...labels}
      theme={theme}
      compact
    />
  );
}

/** Neighbours on one ring around the focal term, starting at the top. */
const concentric = () =>
  ({
    name: 'concentric',
    concentric: (n: cytoscape.NodeSingular) => (n.data('focus') ? 2 : 1),
    levelWidth: () => 1,
    minNodeSpacing: 34,
    startAngle: -Math.PI / 2,
    animate: false,
  }) as cytoscape.LayoutOptions;

type Shown = { nodes: GNode[]; edges: GEdge[]; theme: MapTheme };

/** The graph in `ref`: built once (in the theme then), restyled in place on a theme switch. */
function useTermGraph(
  ref: MutableRef<HTMLElement | null>,
  shown: Shown,
  open: (id: string) => void,
) {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const painted = useRef(shown.theme);
  useEffect(() => {
    if (!ref.current) return;
    const cy = buildTermGraph(ref.current, shown.nodes, shown.edges, painted.current);
    // A tap on a neighbour opens it; the focal term is where you are.
    cy.on('tap', 'node', (evt) => {
      if (!evt.target.data('focus')) open(evt.target.id());
    });
    attachHover(cy);
    const stop = startFlow(cy);
    cyRef.current = cy;
    return () => {
      stop();
      cy.destroy();
      cyRef.current = null;
    };
  }, []);
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || painted.current === shown.theme) return;
    painted.current = shown.theme;
    retheme(cy, shown);
  }, [shown.theme]);
}

/** The concentric graph: the focal term in the middle, labels pointing outwards, fitted. */
function buildTermGraph(container: HTMLElement, nodes: GNode[], edges: GEdge[], t: MapTheme) {
  const cy = cytoscape({
    container,
    elements: termGraphElements(nodes, edges, t),
    style: termGraphStyle(t),
    layout: concentric(),
    minZoom: 0.3,
    maxZoom: 2.5,
  });
  placeLabels(cy, nodes.find((n) => n.focus)?.id);
  smoothFit(cy, 24, 1.4);
  return cy;
}

/** Labels point away from the centre, so neighbours on the ring don't collide. */
function placeLabels(cy: cytoscape.Core, focus: string | undefined) {
  const centre = focus ? cy.getElementById(focus).position() : { x: 0, y: 0 };
  cy.nodes('[focus = 0]').forEach((n) => {
    n.style(labelPlacement(n.position('x') - centre.x, n.position('y') - centre.y));
  });
}

/** A theme switch recolours the elements and swaps the stylesheet; positions stay. */
function retheme(cy: cytoscape.Core, { nodes, edges, theme }: Shown) {
  const paint = edgePaintData(nodes, edges, theme);
  cy.batch(() => {
    for (const n of nodes) {
      const el = cy.getElementById(n.id);
      el.data('colour', nodePaint(n, theme).fill);
      const ring = domainBands(n, undefined, theme)[1];
      if (ring) el.data('ring', ring);
    }
    paint.forEach((p, i) =>
      cy.getElementById(`e${i}`).data({ colour: p.colour, gradient: p.gradient }),
    );
  });
  cy.style(termGraphStyle(theme));
}
