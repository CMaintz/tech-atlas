import { describe, expect, it } from 'vitest';
import { GRAPH_STYLE, graphStyle } from './stylesheet';
import { MAP_INK } from '../graph-style';

type Rule = { selector: string; style: Record<string, unknown> };
const rules = (theme: 'dark' | 'light') => graphStyle(theme) as unknown as Rule[];
const rule = (theme: 'dark' | 'light', selector: string) =>
  rules(theme).find((r) => r.selector === selector)!.style;

describe('graphStyle', () => {
  it('keeps the cascade order: base looks, then hover, then highlight and selection', () => {
    expect(rules('dark').map((r) => r.selector)).toEqual([
      'node[size]',
      'node[ring]',
      'edge',
      'edge[?cross]',
      'edge.flow, edge.hflow',
      'node.faded',
      'edge.faded',
      'node.lit',
      'edge.lit',
      '.dim',
      'node.hl',
      'edge.hl',
      'node.sel',
    ]);
  });
  it('defaults to the night map', () => {
    expect(GRAPH_STYLE).toEqual(graphStyle());
    expect(graphStyle()).toEqual(graphStyle('dark'));
  });
  it('draws each theme in its own ink, with the glow scaled down on cream', () => {
    expect(rule('light', 'node[size]').color).toBe(MAP_INK.light.label);
    expect(rule('dark', 'node[size]')['underlay-color']).toBe('data(colour)');
    expect(rule('light', 'node.sel')['outline-color']).toBe(MAP_INK.light.selected);
    expect(rule('dark', 'node.lit')['underlay-opacity']).toBe(0.45);
    expect(rule('light', 'node.lit')['underlay-opacity']).toBe(0.36);
  });
});
