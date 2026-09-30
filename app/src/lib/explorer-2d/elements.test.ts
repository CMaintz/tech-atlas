import { describe, expect, it } from 'vitest';
import { EXPLORER } from '../explorer-config';
import { clusterColour } from '../graph-style';
import { sizeForRank } from '../graph-layout';
import {
  anchorElements,
  bundleElements,
  bundleGradient,
  bundleWidth,
  linkElements,
  mapElements,
  termElement,
} from './elements';
import { FIXTURE } from './test-fixture';

const byId = new Map(FIXTURE.nodes.map((n) => [n.id, n]));

describe('termElement', () => {
  it('sizes a term and its fonts by rank; only hubs keep a far label', () => {
    const quiet = termElement(FIXTURE.nodes[0], 0.04, 'da').data;
    expect(quiet).toEqual({
      id: 'security/cia',
      label: 'cia-da',
      colour: '#888888',
      size: sizeForRank(0.04),
      font: 8 + Math.round(0.2 * 7),
      farFont: 0,
      hoverFont: 15,
    });
    const hub = termElement(FIXTURE.nodes[0], 1, 'en').data;
    expect(hub.farFont).toBe(26);
    expect(hub.font).toBe(15);
  });
});

describe('linkElements', () => {
  it('marks edges between islands and tints each by its source cluster', () => {
    const edges = linkElements(FIXTURE, byId, 'dark');
    const firewallToThreat = edges[7];
    expect(firewallToThreat.data.source).toBe('cs/firewall');
    expect(firewallToThreat.classes.split(' ')).toContain('xc');
    expect(firewallToThreat.data.tint).toBe(clusterColour('networking', 'cs', 'dark'));
    expect(edges[0].classes.split(' ')).not.toContain('xc');
    expect(edges.map((e) => e.data.id)).toEqual(FIXTURE.links.map((_, i) => `e${i}`));
  });
});

describe('mapElements', () => {
  it('is a node per term then an edge per relationship', () => {
    const els = mapElements(FIXTURE, 'en', 'dark');
    expect(els).toHaveLength(FIXTURE.nodes.length + FIXTURE.links.length);
    expect(els[FIXTURE.nodes.length].data.id).toBe('e0');
  });
});

describe('bundles', () => {
  it('scale their width with the square root of their share', () => {
    const [wMin, wMax] = EXPLORER.edges.bundleWidth;
    expect(bundleWidth(0, 4)).toBe(wMin);
    expect(bundleWidth(4, 4)).toBe(wMax);
    expect(bundleWidth(1, 4)).toBe(wMin + (wMax - wMin) / 2);
  });
  it('join linked islands, alternating their bend', () => {
    const bundles = bundleElements(FIXTURE, byId, 'light');
    expect(bundles.map((b) => [b.data.source, b.data.target, b.data.count])).toEqual([
      ['anc:awareness', 'anc:fundamentals', 1],
      ['anc:awareness', 'anc:networking', 1],
      ['anc:fundamentals', 'anc:networking', 1],
    ]);
    expect(bundles.map((b) => b.data.curve)).toEqual([-24, 24, -24]);
    expect(bundles[0].data.gradient).toBe(bundleGradient('awareness', 'fundamentals', 'light'));
  });
  it('hang off an anchor at each island centre', () => {
    expect(anchorElements(['a'], { a: { x: 1, y: 2 } })).toEqual([
      { group: 'nodes', data: { id: 'anc:a' }, position: { x: 1, y: 2 }, classes: 'anchor' },
    ]);
  });
});
