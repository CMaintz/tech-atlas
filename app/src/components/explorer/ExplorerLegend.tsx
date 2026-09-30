import type { ComponentProps } from 'preact';
import GraphLegend from '../GraphLegend';
import type { Graph } from '../../lib/graph-model';
import { familyColours } from '../../lib/graph-style';
import { legendNodes } from '../../lib/explorer-view';
import type { Section } from './use-explorer';

/** The legend's content: the shown terms' domains, the enabled types, the key hint. */
function legendProps({ p, x }: Section, visible: Graph): ComponentProps<typeof GraphLegend> {
  return {
    nodes: legendNodes(visible.nodes, x.filters.domains),
    families: Object.keys(p.familyColours).filter((f) => x.filters.families.has(f)),
    familyColours: familyColours(x.theme),
    theme: x.theme,
    familyLabels: p.familyLabels,
    domainLabels: p.domainLabels,
    clusterLabels: p.clusterLabels,
    text: p.graphUi,
    open: x.bar.legend.open,
    onToggle: x.bar.legend.toggle,
    hint: x.controls.mode === '3d' ? p.graphUi.keys3d : p.graphUi.keys2d,
  };
}

/** The legend: a collapsible box top-left of the map (below the bar on phones). */
export function ExplorerLegend({ p, x }: Section) {
  const visible = x.shown.visible;
  if (!visible) return null;
  return (
    <div class="absolute top-16 left-3 z-10 md:top-3" data-explorer-legend>
      <GraphLegend {...legendProps({ p, x }, visible)} />
    </div>
  );
}
