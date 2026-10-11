import type { APIRoute } from 'astro';
import { LICENCE } from '../../lib/export';
import { loadExport } from '../../lib/export-data';

export const GET: APIRoute = async ({ site }) => {
  const terms = await loadExport(site);
  return new Response(JSON.stringify({ licence: LICENCE, count: terms.length, terms }), {
    headers: { 'content-type': 'application/json' },
  });
};
