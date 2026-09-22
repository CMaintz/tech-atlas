import { useEffect, useRef } from 'preact/hooks';
import cytoscape from 'cytoscape';

type GNode = { id: string; label: string; focus: boolean; colour: string };
type GEdge = { source: string; target: string; type: string };

interface Props {
  nodes: GNode[];
  edges: GEdge[];
  /** Base URL of term pages; every node links to its page (SPEC §7: the canvas is an index). */
  termBase: string;
}

/**
 * The interactive neighbourhood graph (2D, Cytoscape). ADR-0008: the client-side
 * island; 3D mode via 3d-force-graph arrives in a later phase.
 */
export default function Graph({ nodes, edges, termBase }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const cy = cytoscape({
      container: ref.current,
      elements: [
        ...nodes.map((n) => ({
          data: { id: n.id, label: n.label, focus: n.focus ? 1 : 0, colour: n.colour },
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
            'background-color': 'data(colour)',
            width: 16,
            height: 16,
            label: 'data(label)',
            color: '#e5e5e5',
            'font-size': 10,
            'text-valign': 'top',
            'text-margin-y': -4,
          },
        },
        {
          selector: 'node[focus = 1]',
          style: { width: 26, height: 26, 'border-width': 3, 'border-color': '#ffffff' },
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
    cy.on('tap', 'node', (evt) => {
      const id = evt.target.id();
      if (!evt.target.data('focus')) window.location.href = `${termBase}${id}/`;
    });
    cy.on('mouseover', 'node', () => ref.current && (ref.current.style.cursor = 'pointer'));
    cy.on('mouseout', 'node', () => ref.current && (ref.current.style.cursor = 'default'));
    return () => cy.destroy();
  }, []);

  return (
    <div ref={ref} class="h-[360px] w-full rounded border border-neutral-800 bg-neutral-900" />
  );
}
