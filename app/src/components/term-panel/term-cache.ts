import { makeTermCache } from '../../lib/term-panel';

export type TermCache = ReturnType<typeof makeTermCache>;

const getJson = (u: string) =>
  fetch(u).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${u}`);
    return r.json() as Promise<unknown>;
  });

let pageWideCache: TermCache | undefined;
let pageWideCacheBase = '';
export const termCache = (apiBase: string) => {
  if (!pageWideCache || pageWideCacheBase !== apiBase) {
    pageWideCache = makeTermCache(getJson, apiBase);
    pageWideCacheBase = apiBase;
  }
  return pageWideCache;
};

export const prefetchTerm = (apiBase: string, id: string) => termCache(apiBase).prefetch(id);
