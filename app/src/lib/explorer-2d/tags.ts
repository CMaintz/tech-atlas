/**
 * Tags: the names written on the 2D map — cluster and domain names over the islands,
 * lane names and depth rows / year ticks in the lane layouts. Pure element definitions.
 */
import type cytoscape from 'cytoscape';
import type { GraphNode } from '../graph-model';
import {
  MAP_INK,
  clusterColour,
  domainColour,
  homeDomain,
  outerSide,
  type MapTheme,
  type Point,
} from '../graph-style';
import { effectiveHome, type LaneLayout } from '../graph-layout';
import { getOrThrow } from '../map-get';
import type { IslandMap } from './islands';
import type { Layout } from './types';

export type TagLabels = {
  clusterLabels: Record<string, string>;
  domainLabels: Record<string, string>;
};

/** What a layout's tags are written from: the island map (with term sizes), or its lanes. */
export type TagSource =
  | { layout: 'force'; map: IslandMap; sizeOf: (id: string) => number }
  | { layout: Exclude<Layout, 'force'>; lanes: LaneLayout };

type IslandSource = Extract<TagSource, { layout: 'force' }>;
type LaneSource = Extract<TagSource, { layout: 'depth' | 'time' }>;

type Box = { x1: number; y1: number; x2: number; y2: number };

type TagSpec = {
  id: string;
  label: string;
  colour: string;
  font: number;
  at: Point & { valign: string; halign: string };
  classes: string;
};

const tag = ({ id, label, colour, font, at, classes }: TagSpec): cytoscape.ElementDefinition => ({
  data: { id, label, colour, font, valign: at.valign, halign: at.halign },
  position: { x: at.x, y: at.y },
  classes,
});

/** Each island of three or more terms is named just above its top term. */
function clusterTags({ map, sizeOf }: IslandSource, labels: TagLabels, theme: MapTheme) {
  return map.islands.flatMap((isl) => {
    const mine = getOrThrow(map.members, isl.id, 'island members');
    if (mine.length < 3) return [];
    const top = Math.min(...mine.map((n) => map.positions[n.id].y - sizeOf(n.id) / 2));
    const at = { x: map.centre[isl.id].x, y: top - 8, valign: 'top', halign: 'center' };
    const label = labels.clusterLabels[isl.id] ?? isl.id;
    const colour = clusterColour(isl.id, isl.domain, theme);
    return [tag({ id: `tag:c:${isl.id}`, label, colour, font: 30, at, classes: 'tag' })];
  });
}

/** Where a domain's name goes: outside its box, on the side facing away from the map. */
export function domainTagAt(box: Box, mapCentre: Point) {
  const midX = (box.x1 + box.x2) / 2;
  const midY = (box.y1 + box.y2) / 2;
  return {
    top: { x: midX, y: box.y1 - 30, valign: 'top', halign: 'center' },
    bottom: { x: midX, y: box.y2 + 30, valign: 'bottom', halign: 'center' },
    left: { x: box.x1 - 30, y: midY, valign: 'center', halign: 'left' },
    right: { x: box.x2 + 30, y: midY, valign: 'center', halign: 'right' },
  }[outerSide(box, mapCentre)];
}

/** The box around a domain's islands. */
function domainBox(s: IslandMap, d: string): Box {
  const mine = s.islands.filter((i) => i.domain === d);
  return {
    x1: Math.min(...mine.map((i) => s.centre[i.id].x - i.r)),
    y1: Math.min(...mine.map((i) => s.centre[i.id].y - i.r)),
    x2: Math.max(...mine.map((i) => s.centre[i.id].x + i.r)),
    y2: Math.max(...mine.map((i) => s.centre[i.id].y + i.r)),
  };
}

function domainTags(s: IslandMap, labels: TagLabels, theme: MapTheme) {
  const all = Object.values(s.regions);
  const mapCentre = {
    x: all.reduce((a, p) => a + p.x, 0) / all.length,
    y: all.reduce((a, p) => a + p.y, 0) / all.length,
  };
  return [...new Set(s.islands.map((i) => i.domain))].map((d) => {
    const at = domainTagAt(domainBox(s, d), mapCentre);
    const label = labels.domainLabels[d] ?? d;
    const colour = domainColour(d, theme);
    return tag({ id: `tag:d:${d}`, label, colour, font: 96, at, classes: 'tag domain' });
  });
}

function laneTags({ layout, lanes: s }: LaneSource, labels: TagLabels, theme: MapTheme) {
  const depth = layout === 'depth';
  return s.lanes.map((l) =>
    tag({
      id: `tag:l:${l.domain}`,
      label: labels.domainLabels[l.domain] ?? l.domain,
      colour: domainColour(l.domain, theme),
      font: depth ? 44 : 30,
      at: { ...l, valign: depth ? 'top' : 'center', halign: depth ? 'center' : 'left' },
      classes: 'tag domain',
    }),
  );
}

function tickTags({ layout, lanes: s }: LaneSource, theme: MapTheme) {
  const time = layout === 'time';
  return s.ticks.map((t) => {
    const at = { ...t, valign: time ? 'bottom' : 'center', halign: time ? 'center' : 'left' };
    const colour = MAP_INK[theme].tick;
    return tag({
      id: `tag:t:${t.label}`,
      label: t.label,
      colour,
      font: 22,
      at,
      classes: 'tag tick',
    });
  });
}

/** Every tag of a layout. */
export function tagsFor(
  source: TagSource,
  labels: TagLabels,
  theme: MapTheme,
): cytoscape.ElementDefinition[] {
  if (source.layout === 'force')
    return [...clusterTags(source, labels, theme), ...domainTags(source.map, labels, theme)];
  return [...laneTags(source, labels, theme), ...tickTags(source, theme)];
}

/** A tag's colour in a palette, from its id (`tag:<kind>:<key>`). */
export function tagColour(id: string, theme: MapTheme) {
  const [, kind, key] = id.split(':');
  if (kind === 'c') return clusterColour(key, undefined, theme);
  return kind === 't' ? MAP_INK[theme].tick : domainColour(key, theme);
}

/** Names of disabled domains, and of clusters with nothing left of their own, hide. */
export function tagHidden(
  id: string,
  view: { domains: ReadonlySet<string>; nodes: ReadonlySet<string> },
  nodes: GraphNode[],
) {
  const d = /^tag:(?:d|l):(.+)$/.exec(id);
  if (d) return !view.domains.has(d[1]);
  const c = /^tag:c:(.+)$/.exec(id);
  if (!c) return false;
  return !nodes.some(
    (n) =>
      n.cluster === c[1] &&
      view.nodes.has(n.id) &&
      effectiveHome(n, view.domains) === homeDomain(n),
  );
}
