import { makeTermCache } from '../../lib/term-panel';

export type TermCache = ReturnType<typeof makeTermCache>;

const getJson = (u: string) =>
  fetch(u).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${u}`);
    return r.json() as Promise<unknown>;
  });

/** One cache per page: prefetches from the map and the panel share it. */
let shared: TermCache | undefined;
let sharedBase = '';
export const termCache = (apiBase: string) => {
  if (!shared || sharedBase !== apiBase) {
    shared = makeTermCache(getJson, apiBase);
    sharedBase = apiBase;
  }
  return shared;
};

/** Warm the record for `id` (e.g. on hover), so opening it is instant. */
export const prefetchTerm = (apiBase: string, id: string) => termCache(apiBase).prefetch(id);
