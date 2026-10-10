import { packDiscs, type DiscLink } from './discs';
import { getOrThrow } from '../map-get';
import { domainRank } from './palette';
import type { Point } from './point';

export type Island = { id: string; domain: string; r: number };
export type IslandLink = DiscLink;

export const ISLAND_GAP = 45;
export const DOMAIN_GAP = 150;

type Circle = Point & { r: number };
type Region = { local: Map<string, Point>; r: number };

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

function packRegion(mine: Island[], inside: IslandLink[]): Region {
  const pos = packDiscs(mine, inside, ISLAND_GAP);
  const at = (i: Island) => getOrThrow(pos, i.id, 'island position');
  const cx = mine.reduce((s, i) => s + at(i).x, 0) / mine.length;
  const cy = mine.reduce((s, i) => s + at(i).y, 0) / mine.length;
  const local = new Map<string, Point>();
  let r = 0;
  for (const i of mine) {
    const p = { x: at(i).x - cx, y: at(i).y - cy };
    local.set(i.id, p);
    r = Math.max(r, Math.hypot(p.x, p.y) + i.r);
  }
  return { local, r };
}

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

function domainLinks(list: Island[], links: IslandLink[]): IslandLink[] {
  const domainOf = new Map(list.map((i) => [i.id, i.domain]));
  return canonicalLinks(
    links.flatMap((l) => {
      const a = domainOf.get(l.a);
      const b = domainOf.get(l.b);
      return a !== undefined && b !== undefined && a !== b ? [{ a, b, w: l.w / 4 }] : [];
    }),
  );
}

export function packIslands(
  islands: Island[],
  links: IslandLink[] = [],
): { islands: Record<string, Point>; regions: Record<string, Circle> } {
  const list = [...islands].sort(byDomainThenId);
  const canonical = canonicalLinks(links);
  const regions = packRegions(list, canonical);
  const centres = placeRegions(regions, domainLinks(list, canonical));
  const packed = { regions, centres };
  const circle = ([d, region]: [string, Region]) => [
    d,
    { ...regionCentre(packed, d), r: region.r },
  ];
  return {
    islands: Object.fromEntries(list.map((i) => [i.id, islandCentre(packed, i)])),
    regions: Object.fromEntries([...regions].map(circle)),
  };
}

type PackedRegions = { regions: Map<string, Region>; centres: Map<string, Point> };

const regionCentre = ({ centres }: PackedRegions, domain: string) =>
  getOrThrow(centres, domain, 'region centre');

function islandCentre(packed: PackedRegions, i: Island): Point {
  const c = regionCentre(packed, i.domain);
  const p = getOrThrow(getOrThrow(packed.regions, i.domain, 'region').local, i.id, 'island offset');
  return { x: c.x + p.x, y: c.y + p.y };
}

function placeRegions(regions: Map<string, Region>, links: IslandLink[]): Map<string, Point> {
  const discs = [...regions].map(([id, region]) => ({ id, r: region.r }));
  return packDiscs(discs, links, DOMAIN_GAP);
}
