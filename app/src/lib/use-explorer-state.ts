/**
 * The Explorer's reader-set state (SPEC §7): the filters (domains, relationship
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
  // The overview starts with the owner's types: contrasts, alternatives and "used
  // with" are off until ticked; a selected term shows all its relationships regardless.
  const [families, setFamilies] = useState<Set<string>>(
    () => new Set(Object.keys(familyColours).filter((f) => OVERVIEW_FAMILIES.has(f))),
  );
  const [showAll, setShowAll] = useState(false);
  // The lab drives "show all" from its own panel.
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

/** The open term is kept in the address (`?term=`), so the view can be shared. */
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

/** The lit terms, whose prerequisites they are (if they are that), and what to say. */
function useLitTerms() {
  const [highlight, setHighlight] = useState<string[]>([]);
  const [prerequisitesOfTerm, setPrerequisitesOfTerm] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const lit = useMemo(() => new Set(highlight), [highlight]);
  const light = (ids: string[], of: string | null = null, said = '') => {
    setHighlight(ids);
    setPrerequisitesOfTerm(of);
    setMessage(said);
  };
  return { highlight, lit, message, prerequisitesOfTerm, light };
}

/** The lit terms (a route or prerequisites) and the route form's fields and result. */
export function useRoute(noRoute: string) {
  const { light, ...state } = useLitTerms();
  const fields = useRouteFields();
  /** Light the shortest path from `a` to `b` in `g` and name it (or say there is none). */
  const show = (g: Graph, a: string | undefined, b: string | undefined, name: Namer) => {
    const path = a && b ? shortestPath(g, a, b) : null;
    light(path ?? [], null, routeLabel(path, name, noRoute));
  };
  /** Light a term and everything it requires, directly or not. */
  const prerequisites = (g: Graph, id: string) =>
    light([id, ...prerequisitesOf(g, id).map((n) => n.id)], id);
  const clear = () => light([]);
  /** Light a term's prerequisites, or put them out if they are already lit. */
  const togglePrerequisites = (g: Graph, id: string) =>
    state.prerequisitesOfTerm === id ? clear() : prerequisites(g, id);
  return { ...state, fields, show, clear, prerequisites, togglePrerequisites };
}

/**
 * Closing the term (a click on the empty map, or the panel's close) leaves its views:
 * the map is whole again and its prerequisites go out. Opening another term puts out
 * the last one's prerequisites too.
 */
export function useLeaveClosedTerm(selection: Selection, route: Route, on: boolean) {
  const { selected, setHops } = selection;
  useEffect(() => {
    if (!on) return;
    if (!selected) setHops(null);
    if (route.prerequisitesOfTerm && route.prerequisitesOfTerm !== selected) route.clear();
  }, [on, selected]);
}

type Namer = (id: string) => string;
export type Route = ReturnType<typeof useRoute>;
export type Filters = ReturnType<typeof useFilters>;
export type Selection = ReturnType<typeof useSelection>;
