/**
 * What an Explorer address asks for on arrival: a route between two terms (`?from=&to=`,
 * from a search intent), a focal term with its direct edges (`?focus=`, from a term
 * page) and an open term panel (`?term=`, a shared view). Unknown ids are ignored.
 */
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
