import { describe, expect, it } from 'vitest';
import { MAP_INK, clusterColour, domainColour } from '../graph-style';
import type { LaneLayout } from '../graph-layout';
import type { IslandMap } from './islands';
import { domainTagAt, tagColour, tagHidden, tagsFor } from './tags';
import { FIXTURE, LABELS } from './test-fixture';

const node = (id: string) => FIXTURE.nodes.find((n) => n.id === id)!;
const ids = (...xs: string[]) => xs.map(node);

/** Two islands side by side: fundamentals (4 terms) left, networking (2 shown) right. */
const ISLANDS: IslandMap = {
  positions: {
    'security/cia': { x: -60, y: -40 },
    'security/threat': { x: -40, y: 10 },
    'security/risk': { x: -80, y: 20 },
    'security/vulnerability': { x: -50, y: 40 },
    'cs/network': { x: 100, y: 0 },
    'cs/protocol': { x: 130, y: 10 },
  },
  centre: { fundamentals: { x: -60, y: 0 }, networking: { x: 110, y: 0 } },
  islands: [
    { id: 'fundamentals', domain: 'security', r: 60 },
    { id: 'networking', domain: 'cs', r: 40 },
  ],
  regions: { security: { x: -60, y: 0, r: 80 }, cs: { x: 110, y: 0, r: 50 } },
  members: new Map([
    [
      'fundamentals',
      ids('security/cia', 'security/threat', 'security/risk', 'security/vulnerability'),
    ],
    ['networking', ids('cs/network', 'cs/protocol')],
  ]),
};

const LANES: LaneLayout = {
  positions: {},
  lanes: [{ domain: 'security', x: 0, y: -200 }],
  ticks: [{ label: '1990', x: 10, y: 300 }],
  hidden: [],
};

describe('tagsFor (characterization)', () => {
  it('names islands of three or more above their top term, and domains outside', () => {
    const tags = tagsFor('force', ISLANDS, () => 20, LABELS, 'dark');
    expect(tags).toEqual([
      {
        data: {
          id: 'tag:c:fundamentals',
          label: 'Fundamentals',
          colour: clusterColour('fundamentals', 'security', 'dark'),
          font: 30,
          valign: 'top',
          halign: 'center',
        },
        position: { x: -60, y: -40 - 10 - 8 },
        classes: 'tag',
      },
      {
        data: {
          id: 'tag:d:security',
          label: 'Security',
          colour: domainColour('security', 'dark'),
          font: 96,
          valign: 'center',
          halign: 'left',
        },
        position: { x: -120 - 30, y: 0 },
        classes: 'tag domain',
      },
      {
        data: {
          id: 'tag:d:cs',
          label: 'Computer science',
          colour: domainColour('cs', 'dark'),
          font: 96,
          valign: 'center',
          halign: 'right',
        },
        position: { x: 150 + 30, y: 0 },
        classes: 'tag domain',
      },
    ]);
  });
  it('names lanes and ticks per layout', () => {
    const depth = tagsFor('depth', LANES, () => 0, LABELS, 'light');
    expect(depth.map((t) => [t.data.id, t.data.font, t.data.valign, t.data.halign])).toEqual([
      ['tag:l:security', 44, 'top', 'center'],
      ['tag:t:1990', 22, 'center', 'left'],
    ]);
    expect(depth[1].data.colour).toBe(MAP_INK.light.tick);
    const time = tagsFor('time', LANES, () => 0, LABELS, 'dark');
    expect(time.map((t) => [t.data.font, t.data.valign, t.data.halign])).toEqual([
      [30, 'center', 'left'],
      [22, 'bottom', 'center'],
    ]);
    expect(time.map((t) => t.classes)).toEqual(['tag domain', 'tag tick']);
  });
});

describe('domainTagAt', () => {
  const box = { x1: -10, y1: -10, x2: 10, y2: 10 };
  it('goes on the side facing away from the map centre', () => {
    expect(domainTagAt(box, { x: 0, y: 100 })).toEqual({
      x: 0,
      y: -40,
      valign: 'top',
      halign: 'center',
    });
    expect(domainTagAt(box, { x: 0, y: -100 }).valign).toBe('bottom');
  });
});

describe('tagColour', () => {
  it('follows the tag kind in the palette', () => {
    expect(tagColour('tag:c:networking', 'light')).toBe(
      clusterColour('networking', undefined, 'light'),
    );
    expect(tagColour('tag:t:1990', 'dark')).toBe(MAP_INK.dark.tick);
    expect(tagColour('tag:d:cs', 'dark')).toBe(domainColour('cs', 'dark'));
    expect(tagColour('tag:l:ai', 'light')).toBe(domainColour('ai', 'light'));
  });
});

describe('tagHidden', () => {
  const all = new Set(FIXTURE.nodes.map((n) => n.id));
  const view = (domains: string[], nodes = all) => ({ domains: new Set(domains), nodes });
  it('hides names of disabled domains', () => {
    expect(tagHidden('tag:d:cs', view(['security']), FIXTURE.nodes)).toBe(true);
    expect(tagHidden('tag:l:security', view(['security']), FIXTURE.nodes)).toBe(false);
  });
  it('hides a cluster name once none of its own terms show', () => {
    const net = view(['security'], new Set(['cs/firewall']));
    expect(tagHidden('tag:c:networking', net, FIXTURE.nodes)).toBe(true);
    expect(tagHidden('tag:c:networking', view(['cs', 'security']), FIXTURE.nodes)).toBe(false);
    expect(tagHidden('tag:t:1990', view([]), FIXTURE.nodes)).toBe(false);
  });
});
