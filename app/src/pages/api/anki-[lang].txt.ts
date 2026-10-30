import type { APIRoute, GetStaticPaths } from 'astro';
import { toAnki } from '../../lib/export';
import { loadExport } from '../../lib/export-data';
import { langParams, type Lang } from '../../lib/site';

export const getStaticPaths = langParams satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params, site }) => {
  const lang = params.lang as Lang;
  const deck = lang === 'da' ? 'Atlas (dansk)' : 'Atlas (English)';
  return new Response(toAnki(await loadExport(site), lang, deck), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
