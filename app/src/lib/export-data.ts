import { getCollection } from 'astro:content';
import { exportTerms, type ExportTerm } from './export';
import { loadGraph } from './graph';
import { url } from './site';

let cache: Promise<ExportTerm[]> | undefined;

export const siteRoot = (site: URL | undefined) => new URL(url(''), site).href;

export const loadExport = (site: URL | undefined) =>
  (cache ??= Promise.all([getCollection('terms'), loadGraph()]).then(([terms, graph]) => {
    const depth = new Map(graph.nodes.map((n) => [n.id, n.depth]));
    return exportTerms(
      terms.map((t) => ({ id: t.id, data: t.data, depth: depth.get(t.id) ?? 0 })),
      siteRoot(site),
    );
  }));
