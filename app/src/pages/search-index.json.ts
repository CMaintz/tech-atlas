import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { loadGraph } from '../lib/graph';

/** Static search index consumed by the Search island (names, aliases, summaries, contrasts). */
export const GET: APIRoute = async () => {
  const [terms, graph] = await Promise.all([getCollection('terms'), loadGraph()]);
  const contrasts = new Map<string, string[]>();
  for (const l of graph.links.filter((x) => x.type === 'contrasts-with')) {
    contrasts.set(l.source, [...(contrasts.get(l.source) ?? []), l.target]);
    contrasts.set(l.target, [...(contrasts.get(l.target) ?? []), l.source]);
  }
  const docs = terms.map((t) => ({
    id: t.id,
    term: t.data.term,
    aka: t.data.aka,
    summary: t.data.summary,
    contrasts: contrasts.get(t.id) ?? [],
  }));
  return new Response(JSON.stringify(docs), {
    headers: { 'content-type': 'application/json' },
  });
};
