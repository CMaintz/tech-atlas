import type { ComponentProps } from 'preact';
import { useCallback } from 'preact/hooks';
import TermPanel from '../TermPanel';
import type { Graph, GraphNode } from '../../lib/graph-model';
import type { Route, Selection } from '../../lib/use-explorer-state';
import type { Section } from './use-explorer';
import { actionClass } from './styles';
import type { Dict } from './types';

/** The selected term's docked panel (A80), with the map's actions for it. */
export function ExplorerPanel({ p, x }: Section) {
  const { selected, setSelected } = x.selection;
  const onClose = useCallback(() => setSelected(null), []);
  const term = selected ? x.index.byId.get(selected) : undefined;
  if (!x.graph || !term) return null;
  const on = { term, graph: x.graph, route: x.route, selection: x.selection };
  return (
    <TermPanel
      {...panelData(p, x.graph, term)}
      onSelect={setSelected}
      onClose={onClose}
      actionsLabel={p.ui.mapActions}
      actions={<MapActions ui={p.ui} {...on} />}
    />
  );
}

/** The panel's page data and labels, and the open term. */
function panelData(p: Section['p'], graph: Graph, term: GraphNode) {
  return {
    ...p.panel,
    lang: p.lang,
    id: term.id,
    graph,
    termBase: p.termBase,
    clusterLabels: p.clusterLabels,
    domainLabels: p.domainLabels,
    familyLabels: p.familyLabels,
    graphUi: p.graphUi,
  } satisfies Partial<ComponentProps<typeof TermPanel>>;
}

type ActionProps = { ui: Dict; term: GraphNode; graph: Graph; route: Route; selection: Selection };

/** Light the term's prerequisites, then its neighbourhood controls. */
function MapActions({ ui, term, graph, route, selection }: ActionProps) {
  return (
    <>
      {term.requires.length > 0 && (
        <MapAction active={false} onClick={() => route.prerequisites(graph, term.id)}>
          {ui.showPrerequisites}
        </MapAction>
      )}
      <HopActions ui={ui} selection={selection} />
    </>
  );
}

/** Show the term's neighbourhood (and grow it a hop at a time), or the whole map. */
function HopActions({ ui, selection }: { ui: Dict; selection: Selection }) {
  const { hops, setHops } = selection;
  return (
    <>
      <MapAction active={hops === 1} pressed={hops === 1} onClick={() => setHops(1)}>
        {ui.neighbourhood}
      </MapAction>
      {hops !== null && (
        <MapAction active={false} onClick={() => setHops(hops + 1)}>
          {ui.expand}
        </MapAction>
      )}
      <MapAction active={hops === null} pressed={hops === null} onClick={() => setHops(null)}>
        {ui.wholeMap}
      </MapAction>
    </>
  );
}

type MapActionProps = {
  active: boolean;
  /** A toggle's state (aria-pressed); absent for a one-off action. */
  pressed?: boolean;
  onClick: () => void;
  children: string;
};

function MapAction({ active, pressed, onClick, children }: MapActionProps) {
  return (
    <button type="button" class={actionClass(active)} aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}
