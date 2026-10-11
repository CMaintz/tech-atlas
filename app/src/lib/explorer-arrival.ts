import type { GraphNode } from './graph-model';
import { termFromSearch } from './term-panel';

export type Arrival = {
  route: [string, string] | null;
  focus: string | null;
  term: string | null;
};

export function readArrival(nodes: GraphNode[], search: string): Arrival {
  const params = new URLSearchParams(search);
  const known = (id: string | null) => (id && nodes.some((n) => n.id === id) ? id : null);
  const from = known(params.get('from'));
  const to = known(params.get('to'));
  return {
    route: from && to ? [from, to] : null,
    focus: known(params.get('focus')),
    term: known(termFromSearch(search)),
  };
}
