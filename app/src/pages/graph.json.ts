import type { APIRoute } from 'astro';
import { loadGraph } from '../lib/graph';

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await loadGraph()), {
    headers: { 'content-type': 'application/json' },
  });
