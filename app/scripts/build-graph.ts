/**
 * Build the derived graph artefact (src/generated/graph.json) from authored Terms,
 * using the same model the site serves at /graph.json (src/lib/graph-model.ts).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildGraph, type ModelTerm } from '../src/lib/graph-model';
import { loadTerms } from './load-terms';

const { terms, errors } = loadTerms();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
const graph = buildGraph([...terms.entries()].map(([id, t]) => ({ ...t, id }) as ModelTerm));
mkdirSync('src/generated', { recursive: true });
writeFileSync('src/generated/graph.json', JSON.stringify(graph, null, 2));
const maxDepth = Math.max(0, ...graph.nodes.map((n) => n.depth));
console.log(
  `graph.json: ${graph.nodes.length} nodes, ${graph.links.length} links, max depth ${maxDepth}`,
);
