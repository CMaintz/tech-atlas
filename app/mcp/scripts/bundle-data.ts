import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { toBundle } from '../src/from-dist';

const DIST = resolve(import.meta.dirname, '..', '..', 'dist');
const OUT = resolve(import.meta.dirname, '..', '.data', 'atlas.json');

const read = (path: string): unknown => JSON.parse(readFileSync(resolve(DIST, path), 'utf8'));

function main(): void {
  const bundle = toBundle({
    terms: read('api/terms.json'),
    graph: read('graph.json'),
    search: read('search-index.json'),
    questionsEn: read('questions-en.json'),
    questionsDa: read('questions-da.json'),
  });
  mkdirSync(resolve(OUT, '..'), { recursive: true });
  writeFileSync(OUT, JSON.stringify(bundle));
  console.log(`bundle-data: ${bundle.terms.length} terms, ${bundle.links.length} links -> ${OUT}`);
}

main();
