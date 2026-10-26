import type { RefObject } from 'preact';
import { GLASS } from '../ui/glass';
import type { GraphNode } from '../../lib/graph-model';
import type { MapTheme } from '../../lib/graph-style';
import { effectiveHome, effectivePaint } from '../../lib/graph-layout';
import { hoverCardPlace } from '../../lib/explorer-view';
import type { Point } from '../../lib/use-explorer-maps';
import type { Dict, Lang } from './types';

type Props = {
  card: Point | null;
  byId: ReadonlyMap<string, GraphNode>;
  frame: RefObject<HTMLElement | null>;
  domains: ReadonlySet<string>;
  theme: MapTheme;
  lang: Lang;
  clusterLabels: Dict;
  domainLabels: Dict;
};

const placeIn = (frame: HTMLElement | null, p: Point) =>
  hoverCardPlace(
    p,
    frame?.clientWidth ?? window.innerWidth,
    frame?.clientHeight ?? window.innerHeight,
  );

export function HoverCard({ card, byId, frame, lang, ...labels }: Props) {
  const node = card ? byId.get(card.id) : undefined;
  if (!card || !node) return null;
  return (
    <div
      aria-hidden="true"
      data-hover-card={node.id}
      class={`pointer-events-none absolute z-10 w-64 rounded-xl px-3 py-2 text-xs text-fg-soft ${GLASS}`}
      style={placeIn(frame.current, card)}
    >
      <div class="text-sm font-semibold text-fg">{node.term[lang]}</div>
      <CardTags node={node} {...labels} />
      {node.summary?.[lang] && (
        <p class="mt-1.5 line-clamp-4 leading-snug text-muted">{node.summary[lang]}</p>
      )}
    </div>
  );
}

type TagProps = Omit<Props, 'card' | 'byId' | 'frame' | 'lang'> & { node: GraphNode };

function CardTags({ node, domains, theme, clusterLabels, domainLabels }: TagProps) {
  const home = effectiveHome(node, domains);
  return (
    <div class="mt-1 flex flex-wrap gap-1">
      <span class="inline-flex items-center gap-1 rounded-full border border-border-strong px-2 py-0.5 text-[11px] text-fg-soft">
        <span
          class="inline-block h-2 w-2 rounded-full"
          style={{ background: effectivePaint(node, domains, theme).fill }}
        />
        {clusterLabels[node.cluster] ?? node.cluster}
      </span>
      <span class="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
        {domainLabels[home] ?? home}
      </span>
    </div>
  );
}
