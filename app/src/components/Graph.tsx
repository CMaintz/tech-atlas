import { useEffect, useRef } from 'preact/hooks';
import cytoscape from 'cytoscape';
import type { EdgeType } from '../schema';
import type { Family } from '../lib/graph-model';
import { FAMILY_COLOURS, nodePaint } from '../lib/graph-style';
import { domainBands } from '../lib/graph-layout';
import {
  FADE_TRANSITIONS,
  GRAPH_STYLE,
  attachHover,
  edgeData,
  smoothFit,
  startFlow,
} from '../lib/graph-cytoscape';
import GraphLegend from './GraphLegend';

type Dict = Record<string, string>;
type GNode = { id: string; label: string; focus: boolean; domain: string[]; cluster: string };
/** An edge in its authored direction, with the label for that type. */
type GEdge = { source: string; target: string; type: EdgeType; family: Family; label: string };

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
  const select = useRef(onSelect);
  select.current = onSelect;

  useEffect(() => {
    if (!ref.current) return;
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const focus = nodes.find((n) => n.focus);
    // Neighbours sit on the ring in family, then cluster order, so kin sit together.
    const familyOf = new Map<string, string>();
    for (const e of edges) {
      const other = e.source === focus?.id ? e.target : e.source;
      if (!familyOf.has(other)) familyOf.set(other, e.family);
    }
    const families = Object.keys(FAMILY_COLOURS);
    const ring = nodes
      .filter((n) => !n.focus)
      .sort(
        (a, b) =>
          families.indexOf(familyOf.get(a.id) ?? '') - families.indexOf(familyOf.get(b.id) ?? '') ||
          a.cluster.localeCompare(b.cluster) ||
          a.label.localeCompare(b.label),
      );
    const cy = cytoscape({
      container: ref.current,
      elements: [
        ...[...(focus ? [focus] : []), ...ring].map((n) => {
          const paint = nodePaint(n);
          const ring = domainBands(n)[1];
          return {
            data: {
              id: n.id,
              label: n.label,
              focus: n.focus ? 1 : 0,
              colour: paint.fill,
              ...(ring ? { ring } : {}),
              size: n.focus ? 26 : 15,
              font: n.focus ? 12 : 10,
            },
          };
        }),
        ...edgeData(
          edges,
          (id) => byId.get(id),
          () => 1.6,
        ).map((data, i) => ({
          data: { ...data, label: edges[i].label },
          classes: data.directed ? 'flow' : '',
        })),
      ],
      style: [
        ...(GRAPH_STYLE as unknown[]),
        ...(FADE_TRANSITIONS as unknown[]),
        {
          selector: 'node[focus = 1]',
          style: {
            'outline-width': 2,
            'outline-color': '#ffffff',
            'outline-offset': 3,
            'underlay-opacity': 0.4,
            'underlay-padding': 9,
            'text-valign': 'top',
            'text-margin-y': -6,
            'font-weight': 600,
          },
        },
        {
          selector: 'edge',
          style: {
            label: 'data(label)',
            'font-size': 7,
            color: '#a3a3a3',
            'text-rotation': 'autorotate',
            'text-outline-color': '#171717',
            'text-outline-width': 2,
            // Relationship names appear on hover, so the resting graph stays calm.
            'text-opacity': 0,
            opacity: 0.7,
          },
        },
        { selector: 'edge.flow', style: { opacity: 0.85 } },
        { selector: 'edge.lit', style: { 'text-opacity': 1, 'font-size': 9 } },
      ] as cytoscape.StylesheetJson,
      layout: {
        name: 'concentric',
        concentric: (n: cytoscape.NodeSingular) => (n.data('focus') ? 2 : 1),
        levelWidth: () => 1,
        minNodeSpacing: 34,
        startAngle: -Math.PI / 2,
        animate: false,
      } as cytoscape.LayoutOptions,
      minZoom: 0.3,
      maxZoom: 2.5,
    });
    // Labels point away from the centre, so neighbours on the ring don't collide.
    const centre = focus ? cy.getElementById(focus.id).position() : { x: 0, y: 0 };
    cy.nodes('[focus = 0]').forEach((n) => {
      const dx = n.position('x') - centre.x;
      const dy = n.position('y') - centre.y;
      const r = Math.hypot(dx, dy) || 1;
      const side = (v: number, lo: string, hi: string) =>
        v < -0.15 * r ? lo : v > 0.15 * r ? hi : 'center';
      const h = side(dx, 'left', 'right');
      n.style({
        'text-halign': h,
        'text-valign': h === 'center' ? side(dy, 'top', 'bottom') : 'center',
        'text-margin-x': h === 'left' ? -4 : h === 'right' ? 4 : 0,
        'text-margin-y': h === 'center' ? (dy < 0 ? -3 : 3) : 0,
      });
    });
    smoothFit(cy, 24, 1.4);
    cy.on('tap', 'node', (evt) => {
      const id = evt.target.id();
      if (evt.target.data('focus')) return;
      if (select.current) select.current(id);
      else window.location.href = `${termBase}${id}/`;
    });
    attachHover(cy);
    const stop = startFlow(cy);
    return () => {
      stop();
      cy.destroy();
    };
  }, []);

  const present = new Set(edges.map((e) => e.family));
  return (
    <div class="space-y-2">
      <div
        ref={ref}
        class="h-[360px] w-full rounded border border-neutral-800 bg-[radial-gradient(ellipse_at_center,#161822_0%,#101010_75%)]"
      />
      <GraphLegend
        nodes={nodes}
        families={Object.keys(FAMILY_COLOURS).filter((f) => present.has(f as Family))}
        familyColours={FAMILY_COLOURS}
        familyLabels={props.familyLabels}
        domainLabels={props.domainLabels}
        clusterLabels={props.clusterLabels}
        text={props.text}
        compact
      />
    </div>
  );
}
