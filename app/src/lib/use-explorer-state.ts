/**
 * The Explorer's reader-set state (SPEC §7, A86): the filters (domains, relationship
 * types, "show all"), the selected term and its neighbourhood, and a lit route.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { prerequisitesOf, shortestPath, type Graph } from './graph-model';
import { OVERVIEW_FAMILIES } from './graph-layout';
import { routeLabel, toggled } from './explorer-view';
import { withTermParam } from './term-panel';
import { useLatest } from './use-latest';

/** Domain and relationship-type filters, and the overview / "show all" switch. */
export function useFilters(familyColours: Record<string, string>, labShowAll?: boolean) {
  const [domains, setDomains] = useState<Set<string>>(new Set());
  // The overview starts with the owner's types (A95): contrasts, alternatives and "used
  // with" are off until ticked; a selected term shows all its relationships regardless.
  const [families, setFamilies] = useState<Set<string>>(
    () => new Set(Object.keys(familyColours).filter((f) => OVERVIEW_FAMILIES.has(f))),
  );
  const [showAll, setShowAll] = useState(false);
  // The lab (A96) drives "show all" from its own panel.
  useEffect(() => void (labShowAll !== undefined && setShowAll(labShowAll)), [labShowAll]);
  return {
    domains,
    setDomains,
    toggleDomain: (d: string) => setDomains(toggled(domains, d)),
    families,
    toggleFamily: (f: string) => setFamilies(toggled(families, f)),
    showAll,
    setShowAll,
  };
}

/** The selected term (a single callback sets it) and the hops shown around it. */
export function useSelection() {
  const [selected, setSelected] = useState<string | null>(null);
  /** For handlers built once with a map: the selection now. */
  const selRef = useLatest(selected);
  /** Hops shown around the selected term; null = the whole map (SPEC §7: progressive). */
  const [hops, setHops] = useState<number | null>(null);
  return { selected, setSelected, selRef, hops, setHops };
}

/** The open term is kept in the address (`?term=`), so the view can be shared (A80). */
export function useTermInAddress(graph: Graph | null, selected: string | null) {
  useEffect(() => {
    if (graph)
      history.replaceState(history.state, '', withTermParam(window.location.href, selected));
  }, [graph, selected]);
}

/** The route form's two ends, as typed. */
function useRouteFields() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  return { from, setFrom, to, setTo };
}

/** The lit terms (a route or prerequisites) and the route form's fields and result. */
export function useRoute(noRoute: string) {
  const [highlight, setHighlight] = useState<string[]>([]);
  const lit = useMemo(() => new Set(highlight), [highlight]);
  const fields = useRouteFields();
  const [message, setMessage] = useState('');
  /** Light the shortest path from `a` to `b` in `g` and name it (or say there is none). */
  const show = (g: Graph, a: string | undefined, b: string | undefined, name: Namer) => {
    const path = a && b ? shortestPath(g, a, b) : null;
    setHighlight(path ?? []);
    setMessage(routeLabel(path, name, noRoute));
  };
  const light = (ids: string[]) => {
    setHighlight(ids);
    setMessage('');
  };
  /** Light a term and everything it requires, directly or not. */
  const prerequisites = (g: Graph, id: string) =>
    light([id, ...prerequisitesOf(g, id).map((n) => n.id)]);
  return { highlight, lit, message, fields, show, clear: () => light([]), prerequisites };
}

type Namer = (id: string) => string;
export type Route = ReturnType<typeof useRoute>;
export type Filters = ReturnType<typeof useFilters>;
export type Selection = ReturnType<typeof useSelection>;
