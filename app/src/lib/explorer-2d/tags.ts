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
import type { IslandMap } from './islands';
import type { Layout } from './types';

export type TagLabels = {
  clusterLabels: Record<string, string>;
  domainLabels: Record<string, string>;
};

type Box = { x1: number; y1: number; x2: number; y2: number };

const tag = (
  id: string,
  label: string,
  colour: string,
  font: number,
  at: Point & { valign: string; halign: string },
  classes: string,
): cytoscape.ElementDefinition => ({
  data: { id, label, colour, font, valign: at.valign, halign: at.halign },
  position: { x: at.x, y: at.y },
  classes,
});

/** Each island of three or more terms is named just above its top term. */
function clusterTags(
  s: IslandMap,
  sizeOf: (id: string) => number,
  labels: TagLabels,
  theme: MapTheme,
) {
  return s.islands.flatMap((isl) => {
    const mine = s.members.get(isl.id)!;
    if (mine.length < 3) return [];
    const top = Math.min(...mine.map((n) => s.positions[n.id].y - sizeOf(n.id) / 2));
    const at = { x: s.centre[isl.id].x, y: top - 8, valign: 'top', halign: 'center' };
    const name = labels.clusterLabels[isl.id] ?? isl.id;
    return [tag(`tag:c:${isl.id}`, name, clusterColour(isl.id, isl.domain, theme), 30, at, 'tag')];
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
    const name = labels.domainLabels[d] ?? d;
    return tag(`tag:d:${d}`, name, domainColour(d, theme), 96, at, 'tag domain');
  });
}

function laneTags(layout: Layout, s: LaneLayout, labels: TagLabels, theme: MapTheme) {
  const depth = layout === 'depth';
  return s.lanes.map((l) => {
    const at = { ...l, valign: depth ? 'top' : 'center', halign: depth ? 'center' : 'left' };
    const name = labels.domainLabels[l.domain] ?? l.domain;
    return tag(
      `tag:l:${l.domain}`,
      name,
      domainColour(l.domain, theme),
      depth ? 44 : 30,
      at,
      'tag domain',
    );
  });
}

function tickTags(layout: Layout, s: LaneLayout, theme: MapTheme) {
  const time = layout === 'time';
  return s.ticks.map((t) => {
    const at = { ...t, valign: time ? 'bottom' : 'center', halign: time ? 'center' : 'left' };
    return tag(`tag:t:${t.label}`, t.label, MAP_INK[theme].tick, 22, at, 'tag tick');
  });
}

/** Every tag of a layout. */
export function tagsFor(
  layout: Layout,
  state: IslandMap | LaneLayout,
  sizeOf: (id: string) => number,
  labels: TagLabels,
  theme: MapTheme,
): cytoscape.ElementDefinition[] {
  if (layout === 'force') {
    const s = state as IslandMap;
    return [...clusterTags(s, sizeOf, labels, theme), ...domainTags(s, labels, theme)];
  }
  const s = state as LaneLayout;
  return [...laneTags(layout, s, labels, theme), ...tickTags(layout, s, theme)];
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
