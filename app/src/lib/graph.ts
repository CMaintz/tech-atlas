import { getCollection } from 'astro:content';
import { buildGraph, type Graph, type ModelTerm } from './graph-model';

let cache: Promise<Graph> | undefined;

/** The derived graph for the whole collection, computed once per build. */
export const loadGraph = () =>
  (cache ??= getCollection('terms').then((terms) =>
    buildGraph(terms.map((t) => ({ id: t.id, ...t.data }) as ModelTerm)),
  ));
