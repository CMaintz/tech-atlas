export const on = (...d: string[]) => new Set(d);

export const term = (id: string, domain: string, cluster: string, depth = 0, era?: number) => ({
  id,
  domain: [domain],
  cluster,
  depth,
  era,
});
