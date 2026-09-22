import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/** Static search index consumed by the Search island. */
export const GET: APIRoute = async () => {
  const terms = await getCollection('terms');
  const docs = terms.map((t) => ({
    id: t.id,
    term: t.data.term,
    aka: t.data.aka,
    summary: t.data.summary,
  }));
  return new Response(JSON.stringify(docs), {
    headers: { 'content-type': 'application/json' },
  });
};
