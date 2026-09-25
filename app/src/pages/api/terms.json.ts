import type { APIRoute } from 'astro';
import { LICENCE } from '../../lib/export';
import { loadExport } from '../../lib/export-data';

/** Every Term as one JSON document (A69), with the content licence inside. */
export const GET: APIRoute = async ({ site }) => {
  const terms = await loadExport(site);
  return new Response(JSON.stringify({ licence: LICENCE, count: terms.length, terms }), {
    headers: { 'content-type': 'application/json' },
  });
};
