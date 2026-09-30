/** Shared fixtures for the graph-layout tests. */

/** A set of enabled domains (or visible term ids). */
export const on = (...d: string[]) => new Set(d);

/** A one-domain term with a depth and, optionally, the year it entered use. */
export const term = (id: string, domain: string, cluster: string, depth = 0, era?: number) => ({
  id,
  domain: [domain],
  cluster,
  depth,
  era,
});
