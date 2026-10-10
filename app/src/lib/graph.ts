import { getCollection } from 'astro:content';
import { buildGraph, type Graph, type ModelTerm } from './graph-model';

let cache: Promise<Graph> | undefined;

export const loadGraph = () =>
  (cache ??= getCollection('terms').then((terms) =>
    buildGraph(terms.map((t) => ({ id: t.id, ...t.data }) as ModelTerm)),
  ));
