import { describe, expect, it } from 'vitest';
import type { Graph, GraphLink, GraphNode } from './graph-model';
import { MAP_INK } from './graph-style';
import {
  KNOWLEDGE_COLOURS,
  hoverCardPlace,
  knowledgeColour,
  layoutNote,
  legendNodes,
  neighbourhood,
  routeLabel,
  toggled,
  undatedCount,
  visibleGraph,
  visibleTermIds,
} from './explorer-view';

const node = (id: string, domain = ['cs'], era?: number): GraphNode => ({
  id,
  term: { en: id, da: id },
  domain,
  cluster: 'c',
  era,
  depth: 0,
  degree: 0,
  requires: [],
  collides: false,
  mentions: [],
});
const link = (source: string, target: string, family = 'structure'): GraphLink =>
  ({ source, target, type: 'requires', family, weight: 1 }) as GraphLink;

// A chain a - b - c - d, plus e in another domain linked to a.
const graph: Graph = {
  nodes: [
    node('a', ['cs'], 1970),
    node('b'),
    node('c', ['cs'], 1990),
    node('d'),
    node('e', ['ai']),
  ],
  links: [link('a', 'b'), link('b', 'c'), link('c', 'd', 'kin'), link('e', 'a')],
};
const all = new Set(['cs', 'ai']);

describe('toggled', () => {
  it('adds a missing key and removes a present one, leaving the input alone', () => {
    const s = new Set(['x']);
    expect([...toggled(s, 'y')]).toEqual(['x', 'y']);
    expect([...toggled(s, 'x')]).toEqual([]);
    expect([...s]).toEqual(['x']);
  });
});

describe('neighbourhood', () => {
  const ids = new Set(['a', 'b', 'c', 'd', 'e']);
  it('grows one hop at a time, in both link directions', () => {
    expect([...neighbourhood(graph.links, ids, 'b', 1)].sort()).toEqual(['a', 'b', 'c']);
    expect([...neighbourhood(graph.links, ids, 'b', 2)].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
  it('walks only links between allowed terms', () => {
    expect([...neighbourhood(graph.links, new Set(['a', 'b']), 'a', 3)].sort()).toEqual(['a', 'b']);
  });
});

describe('visibleTermIds', () => {
  const base = { domains: all, datedOnly: false, hops: null, selected: null };
  it('keeps the enabled domains', () => {
    const ids = visibleTermIds(graph, { ...base, domains: new Set(['ai']) });
    expect([...ids]).toEqual(['e']);
  });
  it('keeps only dated terms for the time layout', () => {
    expect([...visibleTermIds(graph, { ...base, datedOnly: true })]).toEqual(['a', 'c']);
  });
  it('limits to a neighbourhood of a shown selected term', () => {
    const ids = visibleTermIds(graph, { ...base, hops: 1, selected: 'd' });
    expect([...ids].sort()).toEqual(['c', 'd']);
  });
  it('ignores the neighbourhood when the selected term is hidden', () => {
    const ids = visibleTermIds(graph, {
      ...base,
      domains: new Set(['ai']),
      hops: 1,
      selected: 'a',
    });
    expect([...ids]).toEqual(['e']);
  });
});

describe('visibleGraph', () => {
  it('keeps shown terms and enabled-family links between them', () => {
    const g = visibleGraph(graph, new Set(['a', 'b', 'c', 'd']), new Set(['structure']));
    expect(g.nodes.map((n) => n.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(g.links.map((l) => `${l.source}-${l.target}`)).toEqual(['a-b', 'b-c']);
  });
});

describe('undatedCount', () => {
  it('counts undated terms of the enabled domains', () => {
    expect(undatedCount(graph.nodes, all)).toBe(3);
    expect(undatedCount(graph.nodes, new Set(['ai']))).toBe(1);
  });
});

describe('knowledgeColour', () => {
  const s = (over: object) => ({ box: 0, due: 0, right: 0, wrong: 0, ...over });
  it('uses a set status first', () => {
    expect(knowledgeColour(s({ status: 'familiar' }), 'dark')).toBe(
      KNOWLEDGE_COLOURS.dark.familiar,
    );
  });
  it('derives know / learning from the review box', () => {
    expect(knowledgeColour(s({ box: 3 }), 'light')).toBe(KNOWLEDGE_COLOURS.light.know);
    expect(knowledgeColour(s({ box: 1 }), 'dark')).toBe(KNOWLEDGE_COLOURS.dark.learning);
  });
  it('is the map ink for an unseen term', () => {
    expect(knowledgeColour(undefined, 'dark')).toBe(MAP_INK.dark.unknown);
    expect(knowledgeColour(s({}), 'light')).toBe(MAP_INK.light.unknown);
  });
});

describe('layoutNote', () => {
  const ui = {
    galaxyNote: 'G',
    depthNote: 'D',
    timeNote: 'T',
    undatedNoteOne: 'one left out',
    undatedNote: '{n} left out',
  };
  it('names the view', () => {
    expect(layoutNote(ui, '3d', 'time', 5)).toBe('G');
    expect(layoutNote(ui, '2d', 'depth', 5)).toBe('D');
    expect(layoutNote(ui, '2d', 'force', 5)).toBe('');
  });
  it('counts undated terms on the time layout', () => {
    expect(layoutNote(ui, '2d', 'time', 0)).toBe('T');
    expect(layoutNote(ui, '2d', 'time', 1)).toBe('T one left out');
    expect(layoutNote(ui, '2d', 'time', 4)).toBe('T 4 left out');
  });
});

describe('routeLabel', () => {
  it('joins the names on the path, or says there is none', () => {
    expect(routeLabel(['a', 'b'], (id) => id.toUpperCase(), 'none')).toBe('A → B');
    expect(routeLabel(null, (id) => id, 'none')).toBe('none');
  });
});

describe('hoverCardPlace', () => {
  it('sits right of the point when it fits, else left', () => {
    expect(hoverCardPlace({ x: 100, y: 100 }, 1000, 800)).toEqual({ left: 118, top: 76 });
    expect(hoverCardPlace({ x: 900, y: 100 }, 1000, 800)).toEqual({ left: 626, top: 76 });
  });
  it('stays inside the map', () => {
    expect(hoverCardPlace({ x: 10, y: 0 }, 100, 800)).toEqual({ left: 8, top: 8 });
    expect(hoverCardPlace({ x: 10, y: 790 }, 1000, 800)).toEqual({ left: 28, top: 640 });
  });
});

describe('legendNodes', () => {
  it('drops re-homed shared terms and hidden domains', () => {
    const shared = node('s', ['cs', 'ai']);
    const out = legendNodes([shared, node('e', ['ai'])], new Set(['ai']));
    expect(out).toEqual([{ cluster: 'c', domain: ['ai'] }]);
    expect(legendNodes([shared], all)).toEqual([{ cluster: 'c', domain: ['cs', 'ai'] }]);
  });
});
