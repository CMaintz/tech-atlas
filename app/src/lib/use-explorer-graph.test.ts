import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Graph, GraphNode } from './graph-model';
import { arrive } from './use-explorer-graph';
import type { Filters, Route, Selection } from './use-explorer-state';

const node = (id: string, domain: string, en: string) =>
  ({ id, domain: [domain], term: { en, da: `${en} (da)` } }) as unknown as GraphNode;

const graph = {
  nodes: [node('tls', 'cs', 'TLS'), node('pki', 'security', 'PKI')],
  links: [],
} as unknown as Graph;

function reader() {
  const filters = { setDomains: vi.fn() };
  const selection = { setSelected: vi.fn(), setHops: vi.fn() };
  const fields = { setFrom: vi.fn(), setTo: vi.fn() };
  const route = { fields, show: vi.fn() };
  return {
    lang: 'da' as const,
    filters: filters as unknown as Filters,
    selection: selection as unknown as Selection,
    route: route as unknown as Route,
    spies: { filters, selection, fields, route },
  };
}

const arriveAt = (search: string) => {
  vi.stubGlobal('window', { location: { search } });
  const r = reader();
  arrive(graph, r);
  return r.spies;
};

afterEach(() => vi.unstubAllGlobals());

describe('arrive', () => {
  it('turns every domain on', () => {
    const { filters } = arriveAt('');
    expect([...filters.setDomains.mock.calls[0][0]]).toEqual(['cs', 'security']);
  });
  it('shows a search intent route, naming its ends in the page language', () => {
    const { fields, route, selection } = arriveAt('?from=tls&to=pki');
    expect(fields.setFrom).toHaveBeenCalledWith('TLS (da)');
    expect(fields.setTo).toHaveBeenCalledWith('PKI (da)');
    expect(route.show).toHaveBeenCalledWith(graph, 'tls', 'pki', expect.any(Function));
    expect(route.show.mock.calls[0][3]('pki')).toBe('PKI (da)');
    expect(selection.setSelected).not.toHaveBeenCalled();
  });
  it('starts at a focal term with its direct edges, then opens a deep-linked term', () => {
    const { selection, route } = arriveAt('?focus=tls&term=pki');
    expect(selection.setHops).toHaveBeenCalledWith(1);
    expect(selection.setSelected.mock.calls).toEqual([['tls'], ['pki']]);
    expect(route.show).not.toHaveBeenCalled();
  });
  it('ignores unknown ids', () => {
    const { selection, route } = arriveAt('?from=tls&to=nope&focus=nope');
    expect(route.show).not.toHaveBeenCalled();
    expect(selection.setSelected).not.toHaveBeenCalled();
  });
});
