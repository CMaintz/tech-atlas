import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Graph } from './graph-model';
import { readArrival } from './explorer-arrival';
import type { Filters, Route, Selection } from './use-explorer-state';
import { getOrThrow } from './map-get';
import { orThrow } from './or-throw';

type Lang = 'en' | 'da';

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

type RouteEnds = [from: string, to: string];

function showSearchIntentRoute(g: Graph, [from, to]: RouteEnds, { route, lang }: Arrive) {
  const nodeOf = (id: string) => g.nodes.find((n) => n.id === id);
  const name = (id: string) => orThrow(nodeOf(id), `term ${id}`).term[lang];
  route.fields.setFrom(name(from));
  route.fields.setTo(name(to));
  route.show(g, from, to, name);
}

export function arrive(g: Graph, reader: Arrive) {
  const { filters, selection } = reader;
  filters.setDomains(new Set(g.nodes.flatMap((n) => n.domain)));
  const { route: path, focus, term } = readArrival(g.nodes, window.location.search);
  if (path) showSearchIntentRoute(g, path, reader);
  if (focus) {
    selection.setSelected(focus);
    selection.setHops(1);
  }
  if (term) selection.setSelected(term);
}

export function useGraphIndex(graph: Graph | null, lang: Lang) {
  const byId = useMemo(() => new Map((graph?.nodes ?? []).map((n) => [n.id, n])), [graph]);
  const nameToId = useMemo(
    () => new Map((graph?.nodes ?? []).map((n) => [n.term[lang].toLowerCase(), n.id])),
    [graph, lang],
  );
  const allDomains = [...new Set((graph?.nodes ?? []).flatMap((n) => n.domain))];
  const name = (id: string) => getOrThrow(byId, id, 'term').term[lang];
  return { byId, nameToId, allDomains, name };
}
