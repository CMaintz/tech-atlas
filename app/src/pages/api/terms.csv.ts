import type { APIRoute } from 'astro';
import { toCsv } from '../../lib/export';
import { loadExport } from '../../lib/export-data';

/** Every Term as CSV (A69), UTF-8 with a byte-order mark so spreadsheets read æ, ø, å. */
export const GET: APIRoute = async ({ site }) =>
  new Response('﻿' + toCsv(await loadExport(site)), {
    headers: { 'content-type': 'text/csv; charset=utf-8' },
  });
