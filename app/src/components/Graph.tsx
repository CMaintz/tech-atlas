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
  termBase: string;
  familyLabels: Dict;
  domainLabels: Dict;
  clusterLabels: Dict;
  text: Dict;
  onSelect?: (id: string) => void;
}

export default function Graph({ nodes, edges, termBase, onSelect, ...props }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const select = useLatest(onSelect);
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

const neighbourRingFromTopLayout = () =>
  ({
    name: 'concentric',
    concentric: (n: cytoscape.NodeSingular) => (n.data('focus') ? 2 : 1),
    levelWidth: () => 1,
    minNodeSpacing: 34,
    startAngle: -Math.PI / 2,
    animate: false,
  }) as cytoscape.LayoutOptions;

type Shown = { nodes: GNode[]; edges: GEdge[]; theme: MapTheme };

function useTermGraph(
  ref: MutableRef<HTMLElement | null>,
  shown: Shown,
  open: (id: string) => void,
) {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const painted = useRef(shown.theme);
  useEffect(() => {
    if (!ref.current) return;
    const mounted = mountTermGraph(ref.current, { ...shown, theme: painted.current }, open);
    cyRef.current = mounted.cy;
    return () => {
      mounted.dispose();
      cyRef.current = null;
    };
  }, []);
  useRethemeInPlace(cyRef, painted, shown);
}

function useRethemeInPlace(
  cyRef: MutableRef<cytoscape.Core | null>,
  painted: MutableRef<MapTheme>,
  shown: Shown,
) {
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || painted.current === shown.theme) return;
    painted.current = shown.theme;
    retheme(cy, shown);
  }, [shown.theme]);
}

function mountTermGraph(container: HTMLElement, shown: Shown, open: (id: string) => void) {
  const cy = buildTermGraph(container, shown);
  cy.on('tap', 'node', (evt) => {
    if (!evt.target.data('focus')) open(evt.target.id());
  });
  attachHover(cy);
  const stop = startFlow(cy);
  const dispose = () => {
    stop();
    cy.destroy();
  };
  return { cy, dispose };
}

function buildTermGraph(container: HTMLElement, { nodes, edges, theme }: Shown) {
  const cy = cytoscape({
    container,
    elements: termGraphElements(nodes, edges, theme),
    style: termGraphStyle(theme),
    layout: neighbourRingFromTopLayout(),
    minZoom: 0.3,
    maxZoom: 2.5,
  });
  pointLabelsAwayFromCentre(cy, nodes.find((n) => n.focus)?.id);
  smoothFit(cy, 24, 1.4);
  return cy;
}

function pointLabelsAwayFromCentre(cy: cytoscape.Core, focus: string | undefined) {
  const centre = focus ? cy.getElementById(focus).position() : { x: 0, y: 0 };
  cy.nodes('[focus = 0]').forEach((n) => {
    n.style(labelPlacement(n.position('x') - centre.x, n.position('y') - centre.y));
  });
}

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
