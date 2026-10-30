export const on = (...d: string[]) => new Set(d);

type TermAt = { domain: string; cluster: string; depth?: number; era?: number };

export const term = (id: string, { domain, cluster, depth = 0, era }: TermAt) => ({
  id,
  domain: [domain],
  cluster,
  depth,
  era,
});
