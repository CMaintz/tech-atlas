import type cytoscape from 'cytoscape';
import { pathOf, sample, type Path } from './explorer-flow-path';

const HIDDEN = ['off', 'dim', 'faded'];
const LIT = ['focus', 'lit'];

const drawn = (e: cytoscape.EdgeSingular) =>
  !HIDDEN.some((c) => e.hasClass(c)) && ![e.source(), e.target()].some((n) => n.hasClass('gone'));

function endsOf(e: cytoscape.EdgeSingular) {
  const s = e.sourceEndpoint();
  const t = e.targetEndpoint();
  if (!s || !t) return null;
  return Number.isFinite(s.x) && Number.isFinite(t.x) ? { s, t } : null;
}

function fillKey(e: cytoscape.EdgeSingular) {
  const lit = LIT.some((c) => e.hasClass(c));
  const colour = (lit || e.hasClass('all') ? e.data('colour') : e.data('tint')) as string;
  return `${colour}|${lit ? 1 : 0}`;
}

function edgeDots(e: cytoscape.EdgeSingular) {
  if (!drawn(e)) return null;
  const ends = endsOf(e);
  if (!ends) return null;
  return { key: fillKey(e), path: pathOf(sample(ends.s, e.controlPoints() ?? [], ends.t)) };
}

export function groupPaths(directed: cytoscape.EdgeCollection) {
  const groups = new Map<string, Path[]>();
  directed.forEach((e) => {
    const d = edgeDots(e);
    if (!d) return;
    const list = groups.get(d.key);
    if (list) list.push(d.path);
    else groups.set(d.key, [d.path]);
  });
  return groups;
}
