import { ExplorerBar } from './explorer/ExplorerBar';
import { ExplorerLegend } from './explorer/ExplorerLegend';
import { ExplorerPanel } from './explorer/ExplorerPanel';
import { HoverCard } from './explorer/HoverCard';
import { MapHost } from './explorer/MapHost';
import { TermOptions } from './explorer/RouteForm';
import type { ExplorerProps } from './explorer/types';
import { useExplorer, type Section } from './explorer/use-explorer';

export type { ExplorerProps } from './explorer/types';

export default function Explorer(props: ExplorerProps) {
  const x = useExplorer(props);
  return (
    <div class="relative h-[calc(100vh-4.25rem)] overflow-hidden map-surface">
      <h1 class="sr-only">{props.ui.explorer}</h1>
      <p class="sr-only">{props.ui.explorerIntro}</p>
      <MapHost p={props} x={x} />
      <TermOptions graph={x.graph} lang={props.lang} />
      <ExplorerBar p={props} x={x} />
      <ExplorerLegend p={props} x={x} />
      <MapHoverCard p={props} x={x} />
      <ExplorerPanel p={props} x={x} />
    </div>
  );
}

function MapHoverCard({ p, x }: Section) {
  return (
    <HoverCard
      card={x.maps.card}
      byId={x.index.byId}
      frame={x.maps.box2d}
      domains={x.filters.domains}
      theme={x.theme}
      lang={p.lang}
      clusterLabels={p.clusterLabels}
      domainLabels={p.domainLabels}
    />
  );
}
