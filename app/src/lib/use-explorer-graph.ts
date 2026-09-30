/** The Explorer's graph: loaded once, arrival deep links applied, indexed by id and name. */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Graph } from './graph-model';
import { readArrival } from './explorer-arrival';
import type { Filters, Route, Selection } from './use-explorer-state';

type Lang = 'en' | 'da';

/**
 * The graph at `url`, null until loaded. `onLoad` runs in the same update as the graph
 * arriving, so the first render with a graph already has its domains and deep links.
 */
export function useGraphLoad(url: string, onLoad: (g: Graph) => void): Graph | null {
  const [graph, setGraph] = useState<Graph | null>(null);
  useEffect(() => {
    fetch(url)
      .then((r) => r.json())
      .then((g: Graph) => {
        setGraph(g);
        onLoad(g);
      });
  }, [url]);
  return graph;
}

type Arrive = { lang: Lang; filters: Filters; selection: Selection; route: Route };

/** Every domain on, then what the address asks for (a route, a focus, an open term). */
export function arrive(g: Graph, { lang, filters, selection, route }: Arrive) {
  filters.setDomains(new Set(g.nodes.flatMap((n) => n.domain)));
  const { route: path, focus, term } = readArrival(g.nodes, window.location.search);
  const name = (id: string) => g.nodes.find((n) => n.id === id)!.term[lang];
  if (path) {
    // Arriving from a search intent: show the route between the two terms.
    route.fields.setFrom(name(path[0]));
    route.fields.setTo(name(path[1]));
    route.show(g, path[0], path[1], name);
  }
  if (focus) {
    // Arriving from a term page: start at the focal term and its direct edges.
    selection.setSelected(focus);
    selection.setHops(1);
  }
  // A deep link (`?term=`) opens that term's panel.
  if (term) selection.setSelected(term);
}

/** Terms by id, ids by lower-cased name, and every domain (in first-seen order). */
export function useGraphIndex(graph: Graph | null, lang: Lang) {
  const byId = useMemo(() => new Map((graph?.nodes ?? []).map((n) => [n.id, n])), [graph]);
  const nameToId = useMemo(
    () => new Map((graph?.nodes ?? []).map((n) => [n.term[lang].toLowerCase(), n.id])),
    [graph, lang],
  );
  const allDomains = [...new Set((graph?.nodes ?? []).flatMap((n) => n.domain))];
  const name = (id: string) => byId.get(id)!.term[lang];
  return { byId, nameToId, allDomains, name };
}
