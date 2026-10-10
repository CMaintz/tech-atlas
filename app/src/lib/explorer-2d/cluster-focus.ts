import type cytoscape from 'cytoscape';
import { EXPLORER } from '../explorer-config';
import { smoothFit } from '../graph-cytoscape';
import type { MapParts, MapState } from './context';
import type { Crowd } from './focus';

const CLUSTER_TAGS = 'node.tag[id ^= "tag:c:"]';

const clusterOfTag = (tag: cytoscape.NodeSingular) => tag.id().slice('tag:c:'.length);

function membersBiggestFirst(p: MapParts, tag: cytoscape.NodeSingular) {
  const cluster = clusterOfTag(tag);
  return p.terms
    .filter((n) => !n.hasClass('gone') && p.clusterOf(n.id()) === cluster)
    .sort(
      (a, b) => b.data('size') - a.data('size') || (a.id() < b.id() ? -1 : 1),
    ) as cytoscape.NodeCollection;
}

function lightCentralTerms(p: MapParts, s: MapState, tag: cytoscape.NodeSingular) {
  const members = membersBiggestFirst(p, tag);
  const central = members.slice(0, EXPLORER.v2.central) as cytoscape.NodeCollection;
  const inside = members.union(members.edgesWith(members).not('.off')).union(tag);
  p.cy.batch(() => {
    s.shown.not(inside).addClass('faded');
    p.cy.nodes('.tag').not(tag).addClass('faded');
    central.addClass('lit');
    tag.addClass('named');
  });
  return central;
}

function unlight(p: MapParts, s: MapState) {
  p.cy.batch(() => {
    s.shown.removeClass('faded lit');
    p.cy.nodes('.tag').removeClass('faded named');
    p.cy.nodes('.hoverhide').removeClass('hoverhide');
  });
}

function fitClusterInView(p: MapParts, tag: cytoscape.NodeSingular) {
  const members = membersBiggestFirst(p, tag);
  if (members.empty()) return;
  p.cy.stop(true);
  smoothFit(p.cy, 48, EXPLORER.v2.maxZoom2d, p.opts.reserveRight(), members.union(tag));
}

const mayLight = ({ hovered, view }: MapState) =>
  !hovered && !!view && !view.selected && !view.highlight.size;

function createHover(p: MapParts, s: MapState, crowd: Crowd) {
  let timer = 0;
  let lit = false;
  const show = (tag: cytoscape.NodeSingular) => {
    crowd(lightCentralTerms(p, s, tag)).addClass('hoverhide');
    lit = true;
  };
  const off = () => {
    window.clearTimeout(timer);
    if (lit) unlight(p, s);
    lit = false;
  };
  const over = (tag: cytoscape.NodeSingular) => {
    window.clearTimeout(timer);
    if (mayLight(s)) timer = window.setTimeout(() => show(tag), EXPLORER.hoverDelayMs);
  };
  return { over, off };
}

export function bindClusterFocus(p: MapParts, s: MapState, crowd: Crowd) {
  const { over, off } = createHover(p, s, crowd);
  const style = p.opts.container.style;
  p.cy.on('mouseover', CLUSTER_TAGS, (e) => {
    style.cursor = 'pointer';
    over(e.target);
  });
  p.cy.on('mouseout', CLUSTER_TAGS, () => {
    style.cursor = 'grab';
    off();
  });
  p.cy.on('tap', CLUSTER_TAGS, (e) => {
    off();
    fitClusterInView(p, e.target);
  });
  return off;
}
