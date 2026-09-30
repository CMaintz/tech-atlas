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

/**
 * The legend: a pill bottom-left of the map that opens upward (A93b), so it never meets
 * the bar. From md it sits right of the fixed BETA corner ribbon (8rem square). It steps
 * aside while the phones' Controls sheet is open (and, by the page's CSS, while the term
 * panel covers it).
 */
export function ExplorerLegend({ p, x }: Section) {
  const visible = x.shown.visible;
  if (!visible) return null;
  const hidden = x.bar.pop === 'sheet' ? 'invisible' : '';
  return (
    <div class={`${LEGEND_PLACE} ${hidden}`} data-explorer-legend>
      <GraphLegend {...legendProps({ p, x }, visible)} upward />
    </div>
  );
}

const LEGEND_PLACE =
  'absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] z-10 md:left-[8.5rem]';
