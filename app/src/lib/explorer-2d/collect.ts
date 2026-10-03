/**
 * `cy.collection(elements)`: Cytoscape builds a collection from an array of elements
 * (its documented behaviour), but its typings accept only element definitions or a
 * collection, and return the untyped union. Typed once here, as what it builds.
 */
import type cytoscape from 'cytoscape';

type Elements = cytoscape.SingularElementArgument[];

const collect = (cy: cytoscape.Core, elements: Elements) =>
  cy.collection(elements as unknown as cytoscape.CollectionArgument);

export const collectNodes = (cy: cytoscape.Core, nodes: Elements) =>
  collect(cy, nodes) as cytoscape.NodeCollection;

export const collectEdges = (cy: cytoscape.Core, edges: cytoscape.EdgeSingular[]) =>
  collect(cy, edges) as cytoscape.EdgeCollection;
