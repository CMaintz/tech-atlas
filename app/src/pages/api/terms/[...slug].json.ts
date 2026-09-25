import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { LICENCE } from '../../../lib/export';
import { loadExport } from '../../../lib/export-data';

/** One Term per file at /api/terms/<folder>/<id>.json (A69), the same record as terms.json. */
export const getStaticPaths = (async () =>
  (await getCollection('terms')).map((t) => ({
    params: { slug: t.id },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params, site }) => {
  const term = (await loadExport(site)).find((t) => t.id === params.slug)!;
  return new Response(JSON.stringify({ licence: LICENCE, ...term }), {
    headers: { 'content-type': 'application/json' },
  });
};
