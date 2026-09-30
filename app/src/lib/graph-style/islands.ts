/**
 * The 2D map's island layout (A74): each cluster is an island, each domain a region of
 * islands, and both levels are packed as discs so they read as separate and coherent.
 */
import { packDiscs, type DiscLink } from './discs';
import { domainRank } from './palette';
import type { Point } from './point';

/** An island: one cluster's terms, already laid out, seen from outside as a circle. */
export type Island = { id: string; domain: string; r: number };
/** How strongly two islands are related (e.g. the number of edges between them). */
export type IslandLink = DiscLink;

/** Clear space between two islands of one domain, and between two domains' islands. */
export const ISLAND_GAP = 45;
export const DOMAIN_GAP = 150;

type Circle = Point & { r: number };
/** A packed domain region: each island's offset from the region's centre, and its radius. */
type Region = { local: Map<string, Point>; r: number };

/** Links in one canonical order (a < b, weights of duplicates summed). */
export function canonicalLinks(links: IslandLink[]): IslandLink[] {
  const merged = new Map<string, IslandLink>();
  for (const l of links) {
    const [a, b] = l.a < l.b ? [l.a, l.b] : [l.b, l.a];
    const key = JSON.stringify([a, b]);
    merged.set(key, { a, b, w: (merged.get(key)?.w ?? 0) + l.w });
  }
  return [...merged.entries()].sort(([x], [y]) => (x < y ? -1 : 1)).map(([, l]) => l);
}

const byDomainThenId = (a: Island, b: Island) =>
  domainRank(a.domain) - domainRank(b.domain) ||
  a.domain.localeCompare(b.domain) ||
  a.id.localeCompare(b.id);

/** Pack one domain's islands ISLAND_GAP apart, centred on their own mean, and measure it. */
function packRegion(mine: Island[], inside: IslandLink[]): Region {
  const pos = packDiscs(mine, inside, ISLAND_GAP);
  const cx = mine.reduce((s, i) => s + pos.get(i.id)!.x, 0) / mine.length;
  const cy = mine.reduce((s, i) => s + pos.get(i.id)!.y, 0) / mine.length;
  const local = new Map<string, Point>();
  let r = 0;
  for (const i of mine) {
    const p = { x: pos.get(i.id)!.x - cx, y: pos.get(i.id)!.y - cy };
    local.set(i.id, p);
    r = Math.max(r, Math.hypot(p.x, p.y) + i.r);
  }
  return { local, r };
}

/** Every domain's region, packed from its own islands and the links among them. */
function packRegions(list: Island[], links: IslandLink[]): Map<string, Region> {
  const domainOf = new Map(list.map((i) => [i.id, i.domain]));
  const domains = [...new Set(list.map((i) => i.domain))];
  return new Map(
    domains.map((d) => {
      const mine = list.filter((i) => i.domain === d);
      const inside = links.filter((l) => domainOf.get(l.a) === d && domainOf.get(l.b) === d);
      return [d, packRegion(mine, inside)];
    }),
  );
}

/** Links between islands of different domains, as domain-to-domain links at a quarter weight. */
function domainLinks(list: Island[], links: IslandLink[]): IslandLink[] {
  const domainOf = new Map(list.map((i) => [i.id, i.domain]));
  return canonicalLinks(
    links
      .filter((l) => domainOf.get(l.a) !== domainOf.get(l.b))
      .map((l) => ({ a: domainOf.get(l.a)!, b: domainOf.get(l.b)!, w: l.w / 4 })),
  );
}

/**
 * Where each cluster island goes (A74), in two levels: each domain's islands are
 * packed into a region (ISLAND_GAP apart, related islands drawn together), then the
 * regions are packed as discs (DOMAIN_GAP apart, drawn together by the links between
 * domains). Clusters read as separate islands, domains as separate, coherent regions.
 * Returns island centres and each region's circle. Deterministic; independent of
 * input order.
 */
export function packIslands(
  islands: Island[],
  links: IslandLink[] = [],
): { islands: Record<string, Point>; regions: Record<string, Circle> } {
  const list = [...islands].sort(byDomainThenId);
  const canonical = canonicalLinks(links);
  const regions = packRegions(list, canonical);
  const centres = placeRegions(regions, domainLinks(list, canonical));
  const place = (i: Island) => {
    const c = centres.get(i.domain)!;
    const p = regions.get(i.domain)!.local.get(i.id)!;
    return [i.id, { x: c.x + p.x, y: c.y + p.y }];
  };
  const circle = ([d, region]: [string, Region]) => [d, { ...centres.get(d)!, r: region.r }];
  return {
    islands: Object.fromEntries(list.map(place)),
    regions: Object.fromEntries([...regions].map(circle)),
  };
}

/** Each region's centre: the regions packed as discs, DOMAIN_GAP apart. */
function placeRegions(regions: Map<string, Region>, links: IslandLink[]): Map<string, Point> {
  const discs = [...regions].map(([id, region]) => ({ id, r: region.r }));
  return packDiscs(discs, links, DOMAIN_GAP);
}
