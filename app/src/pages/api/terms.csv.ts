import type { APIRoute } from 'astro';
import { toCsv } from '../../lib/export';
import { loadExport } from '../../lib/export-data';

export const GET: APIRoute = async ({ site }) =>
  new Response('﻿' + toCsv(await loadExport(site)), {
    headers: { 'content-type': 'text/csv; charset=utf-8' },
  });
