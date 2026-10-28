import type { ComponentChildren, HTMLAttributes, Ref } from 'preact';
import { getOrThrow } from '../../lib/map-get';
import { useTimelineCtx } from './context';
import { inkVars } from './ink';
import type { TimelineEntry, TimelinePanel } from './types';
import type { MoreList } from './use-more-list';
import type { Selection } from './use-selection';
import type { useTermPanel } from './use-term-panel';

function belowAnchorOnScreenStyle(x: number, y: number): Record<string, string> | undefined {
  if (typeof window === 'undefined' || window.innerWidth < 640) return undefined;
  const left = Math.min(Math.max(8, x - 8), window.innerWidth - 336);
  const below = y + 8 + 180 < window.innerHeight;
  return below
    ? { left: `${left}px`, top: `${y + 8}px` }
    : { left: `${left}px`, bottom: `${window.innerHeight - y + 32}px` };
}

type PopoverProps = Omit<HTMLAttributes<HTMLDivElement>, 'ref'> & {
  pinned: boolean;
  at: { x: number; y: number };
  popRef?: Ref<HTMLDivElement>;
  class: string;
  children: ComponentChildren;
};

function FrostedPopover({ pinned, at, popRef, class: extra, children, ...rest }: PopoverProps) {
  return (
    <div
      ref={popRef}
      role={pinned ? 'dialog' : 'tooltip'}
      class={`fixed z-50 rounded-lg border border-border-strong bg-surface/95 shadow-xl shadow-black/20 dark:shadow-black/50 backdrop-blur ${extra}`}
      style={belowAnchorOnScreenStyle(at.x, at.y)}
      {...rest}
    >
      {children}
    </div>
  );
}

type ById = Map<string, TimelineEntry>;

const byYearThenName = (a: TimelineEntry, b: TimelineEntry) =>
  a.year - b.year || a.name.localeCompare(b.name);

export function MorePopover({ list, byId }: { list: MoreList; byId: ById }) {
  const { more } = list;
  if (!more) return null;
  return (
    <FrostedPopover
      data-tl-more
      pinned={more.pinned}
      at={more}
      class="max-h-80 w-64 overflow-y-auto p-2 text-xs"
      onMouseEnter={list.hold}
      onMouseLeave={list.leave}
    >
      <MoreTerms ids={more.ids} byId={byId} list={list} />
    </FrostedPopover>
  );
}

function MoreTerms({ ids, byId, list }: { ids: string[]; byId: ById; list: MoreList }) {
  const terms = ids.map((id) => getOrThrow(byId, id, 'timeline entry')).sort(byYearThenName);
  return (
    <ul class="space-y-0.5">
      {terms.map((it) => (
        <MoreTerm it={it} list={list} />
      ))}
    </ul>
  );
}

function MoreTerm({ it, list }: { it: TimelineEntry; list: MoreList }) {
  const { item } = useTimelineCtx();
  const pick = (e: MouseEvent) => {
    item(it).onClick(e);
    list.close();
  };
  return (
    <li>
      <a
        href={it.href}
        class="flex items-baseline gap-2 rounded px-1.5 py-1 text-fg-soft hover:bg-surface-2 hover:text-fg"
        onClick={pick}
      >
        <YearAndName it={it} />
      </a>
    </li>
  );
}

function YearAndName({ it }: { it: TimelineEntry }) {
  return (
    <>
      <span class="font-mono text-[10px] text-subtle">{it.year}</span>
      <span class={it.hub ? 'font-semibold' : ''}>{it.name}</span>
    </>
  );
}

export function TermPopover({ selection, byId }: { selection: Selection; byId: ById }) {
  const { sel } = selection;
  const it = sel && byId.get(sel.id);
  if (!sel || !it) return null;
  return (
    <FrostedPopover
      popRef={selection.popRef}
      pinned={sel.pinned}
      at={sel}
      aria-label={it.name}
      class="inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] p-4 text-sm sm:inset-x-auto sm:bottom-auto sm:w-80"
    >
      <TermSummary it={it} />
      <OpenTermAndClose it={it} onClose={sel.pinned ? selection.clear : undefined} />
    </FrostedPopover>
  );
}

function TermSummary({ it }: { it: TimelineEntry }) {
  return (
    <>
      <div class="mb-1 flex items-baseline gap-2">
        <span class="font-mono text-xs text-subtle">{it.year}</span>
        <span class="font-semibold text-fg">{it.name}</span>
      </div>
      <TermDomains domains={it.domain} />
      {it.summary && <p class="mb-3 text-fg-soft">{it.summary}</p>}
    </>
  );
}

function TermDomains({ domains }: { domains: string[] }) {
  const { ink, label } = useTimelineCtx();
  return (
    <p class="mb-2 flex flex-wrap gap-2 text-[11px]">
      {domains.map((d) => (
        <span class="map-ink" style={`${inkVars(ink(d))}color:var(--ink)`}>
          {label(d)}
        </span>
      ))}
    </p>
  );
}

function OpenTermAndClose({ it, onClose }: { it: TimelineEntry; onClose?: () => void }) {
  const { text } = useTimelineCtx();
  return (
    <div class="flex items-center justify-between">
      <a
        class="inline-flex min-h-11 items-center text-accent hover:underline sm:min-h-0"
        href={it.href}
      >
        {text.openTerm} →
      </a>
      {onClose && <CloseButton label={text.close} onClick={onClose} />}
    </div>
  );
}

function CloseButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      class="min-h-11 px-2 text-sm text-muted hover:text-fg sm:min-h-0 sm:px-0 sm:text-xs"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

type PanelHostProps = {
  panel: ReturnType<typeof useTermPanel>;
  config: TimelinePanel | undefined;
  domainLabels: Record<string, string>;
};

export function PanelHost({ panel, config, domainLabels }: PanelHostProps) {
  const { kit, id } = panel;
  if (!kit || !id || !config) return null;
  return (
    <div class="pointer-events-none fixed inset-0 z-40 [&>*]:pointer-events-auto">
      <kit.View
        {...config}
        domainLabels={domainLabels}
        id={id}
        graph={kit.graph}
        onSelect={panel.setId}
        onClose={() => panel.setId(null)}
      />
    </div>
  );
}
