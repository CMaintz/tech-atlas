/**
 * The export records for the whole collection, computed once per build (A69).
 * Astro-side glue over the pure `export.ts`.
 */
import { getCollection } from 'astro:content';
import { exportTerms, type ExportTerm } from './export';
import { loadGraph } from './graph';
import { url } from './site';

let cache: Promise<ExportTerm[]> | undefined;

/** Absolute site root under the base path, e.g. https://cmaintz.github.io/tech-atlas/. */
export const siteRoot = (site: URL | undefined) => new URL(url(''), site).href;

export const loadExport = (site: URL | undefined) =>
  (cache ??= Promise.all([getCollection('terms'), loadGraph()]).then(([terms, graph]) => {
    const depth = new Map(graph.nodes.map((n) => [n.id, n.depth]));
    return exportTerms(
      terms.map((t) => ({ id: t.id, data: t.data, depth: depth.get(t.id) ?? 0 })),
      siteRoot(site),
    );
  }));
