import type cytoscape from 'cytoscape';

type Elements = cytoscape.SingularElementArgument[];

const elementArrayAsCollectionArgument = (elements: Elements) =>
  elements as unknown as cytoscape.CollectionArgument;

const collectionOf = (cy: cytoscape.Core, elements: Elements) =>
  cy.collection(elementArrayAsCollectionArgument(elements));

export const collectNodes = (cy: cytoscape.Core, nodes: Elements) =>
  collectionOf(cy, nodes) as cytoscape.NodeCollection;

export const collectEdges = (cy: cytoscape.Core, edges: cytoscape.EdgeSingular[]) =>
  collectionOf(cy, edges) as cytoscape.EdgeCollection;
