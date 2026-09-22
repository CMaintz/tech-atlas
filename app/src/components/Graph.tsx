import { useEffect, useRef } from 'preact/hooks';
import cytoscape from 'cytoscape';

type GNode = { id: string; label: string; focus: boolean };
type GEdge = { source: string; target: string; type: string };

interface Props {
  nodes: GNode[];
  edges: GEdge[];
}

/**
 * The interactive neighbourhood graph (2D, Cytoscape). ADR-0008: the client-side
 * island; 3D mode via 3d-force-graph arrives in a later phase.
 */
export default function Graph({ nodes, edges }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const cy = cytoscape({
      container: ref.current,
      elements: [
        ...nodes.map((n) => ({
          data: { id: n.id, label: n.label, focus: n.focus ? 1 : 0 },
        })),
        ...edges.map((e) => ({
          data: {
            id: `${e.source}__${e.target}__${e.type}`,
            source: e.source,
            target: e.target,
            label: e.type,
          },
        })),
      ],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#3b82f6',
            label: 'data(label)',
            color: '#e5e5e5',
            'font-size': 10,
            'text-valign': 'top',
            'text-margin-y': -4,
          },
        },
        {
          selector: 'node[focus = 1]',
          style: { 'background-color': '#f59e0b', width: 28, height: 28 },
        },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#525252',
            'target-arrow-color': '#525252',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': 7,
            color: '#737373',
          },
        },
      ] as cytoscape.StylesheetJson,
      layout: { name: 'cose', animate: false },
      minZoom: 0.3,
      maxZoom: 2.5,
    });
    return () => cy.destroy();
  }, []);

  return (
    <div ref={ref} class="h-[420px] w-full rounded border border-neutral-800 bg-neutral-900" />
  );
}
