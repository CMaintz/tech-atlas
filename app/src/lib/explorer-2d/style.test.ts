import { describe, expect, it } from 'vitest';
import { EXPLORER } from '../explorer-config';
import { MAP_INK } from '../graph-style';
import { graphStyle } from '../graph-cytoscape';
import { mapStylesheet } from './style';

type Rule = { selector: string; style: Record<string, string | number> };

/** The 2D rules: the stylesheet after the shared look. */
const extraStyle = (theme: 'dark' | 'light') =>
  (mapStylesheet(theme) as Rule[]).slice((graphStyle(theme) as unknown[]).length);

const rule = (theme: 'dark' | 'light', selector: string) =>
  extraStyle(theme).find((r) => r.selector === selector)!.style;

describe('the 2D rules (characterization: the cascade the lab builds on)', () => {
  it('keeps its rules in cascade order', () => {
    expect(extraStyle('dark').map((r) => r.selector)).toEqual([
      'core',
      '.gone',
      'edge.off',
      'edge.bb',
      'edge.bb.xc',
      'edge.all, edge.lit, edge.hl, edge.focus',
      'edge[?cross].all, edge[?cross].lit, edge[?cross].hl, edge[?cross].focus',
      'edge.all',
      'edge.focus',
      'edge.bundle',
      'edge.bundle.faded',
      'edge.bundle.near',
      'node.anchor',
      'node.far',
      'node.far[farFont = 0]',
      'node[size]',
      'node.nolabel',
      'node.far.lit, node.far.sel, node.far.hl',
      'node.nolabel.lit, node.nolabel.sel, node.nolabel.hl',
      'node.hoverhide',
      'node.tag',
      'node.tag.domain',
      'node.tag.tick',
      'node.tag.faded',
      'node.faded',
      'edge.faded',
      'node.dim',
      'edge.dim',
      'edge.bundle.dim',
      'node.tag.dim',
      'node.nb',
      'node.far.nb',
      'node.pv',
      'edge.pv',
      'edge.rl, edge.rlh',
    ]);
  });
  it('draws the resting backbone cheaply and the revealed edges in full', () => {
    expect(rule('dark', 'edge.bb')['curve-style']).toBe('haystack');
    expect(rule('dark', 'edge.bb.xc').opacity).toBe(EXPLORER.edges.crossAlpha);
    expect(rule('dark', 'edge.all').opacity).toBe(EXPLORER.edges.allAlpha);
    expect(rule('dark', 'edge.all, edge.lit, edge.hl, edge.focus')['target-arrow-shape']).toBe(
      'data(arrow)',
    );
  });
  it('writes tags as labels without a node, in the palette halo', () => {
    expect(rule('dark', 'node.tag')).toEqual({
      'background-opacity': 0,
      'border-width': 0,
      'underlay-opacity': 0,
      width: 1,
      height: 1,
      label: 'data(label)',
      color: 'data(colour)',
      'font-size': 'data(font)',
      'font-weight': 600,
      'text-valign': 'data(valign)',
      'text-halign': 'data(halign)',
      'text-opacity': 0.8,
      'text-outline-color': MAP_INK.dark.halo,
      'text-outline-width': 3,
      'text-outline-opacity': 0.85,
      'min-zoomed-font-size': 6,
      'z-index': 0,
      events: 'no',
    });
    expect(rule('light', 'node.tag')['text-outline-color']).toBe(MAP_INK.light.halo);
  });
  it('follows the palette for ticks and relationship names', () => {
    expect(rule('dark', 'node.tag.tick')['text-opacity']).toBe(0.35);
    expect(rule('light', 'node.tag.tick')['text-opacity']).toBe(1);
    expect(rule('light', 'edge.rl, edge.rlh').color).toBe(MAP_INK.light.label);
  });
});

describe('mapStylesheet', () => {
  it('starts with the shared look', () => {
    const sheet = mapStylesheet('light') as unknown[];
    const shared = graphStyle('light') as unknown[];
    expect(sheet.slice(0, shared.length)).toEqual(shared);
  });
});
