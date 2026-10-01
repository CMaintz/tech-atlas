import type { ComponentChildren, JSX, Ref } from 'preact';
import { useTimelineCtx } from './context';
import { inkVars } from './ink';
import type { TimelineEntry, TimelinePanel } from './types';
import type { More, MoreList } from './use-more-list';
import type { Sel, Selection } from './use-selection';
import { panelCallbacks, type useTermPanel } from './use-term-panel';

/** Desktop: below the anchor, kept on screen. Phones use the CSS bottom sheet instead. */
function popStyle(x: number, y: number): Record<string, string> | undefined {
  if (typeof window === 'undefined' || window.innerWidth < 640) return undefined;
  const left = Math.min(Math.max(8, x - 8), window.innerWidth - 336);
  const below = y + 8 + 180 < window.innerHeight;
  return below
    ? { left: `${left}px`, top: `${y + 8}px` }
    : { left: `${left}px`, bottom: `${window.innerHeight - y + 32}px` };
}

type PopoverProps = Omit<JSX.HTMLAttributes<HTMLDivElement>, 'ref'> & {
  /** A pinned popover is a dialog; a hover/focus preview is a tooltip. */
  pinned: boolean;
  /** The anchor's bottom-left corner, in viewport px. */
  at: { x: number; y: number };
  popRef?: Ref<HTMLDivElement>;
  class: string;
  children: ComponentChildren;
};

/** The floating card both popovers share: frosted surface, placed below its anchor. */
function Popover({ pinned, at, popRef, class: extra, children, ...rest }: PopoverProps) {
  return (
    <div
      ref={popRef}
      role={pinned ? 'dialog' : 'tooltip'}
      class={`fixed z-50 rounded-lg border border-border-strong bg-surface/95 shadow-xl shadow-black/20 dark:shadow-black/50 backdrop-blur ${extra}`}
      style={popStyle(at.x, at.y)}
      {...rest}
    >
      {children}
    </div>
  );
}

type ById = Map<string, TimelineEntry>;

const byYearThenName = (a: TimelineEntry, b: TimelineEntry) =>
  a.year - b.year || a.name.localeCompare(b.name);

/** The terms behind the open "+N" chip, oldest first; picking one acts like clicking it. */
export function MorePopover({ list, byId }: { list: MoreList; byId: ById }) {
  const { more } = list;
  if (!more) return null;
  return <MoreCard more={more} list={list} byId={byId} />;
}

/** The open list's card; the pointer resting on it keeps a hover preview open. */
function MoreCard({ more, list, byId }: { more: More; list: MoreList; byId: ById }) {
  return (
    <Popover
      data-tl-more
      pinned={more.pinned}
      at={more}
      class="max-h-80 w-64 overflow-y-auto p-2 text-xs"
      onMouseEnter={list.hold}
      onMouseLeave={list.leave}
    >
      <MoreTerms ids={more.ids} byId={byId} list={list} />
    </Popover>
  );
}

function MoreTerms({ ids, byId, list }: { ids: string[]; byId: ById; list: MoreList }) {
  const terms = ids.map((id) => byId.get(id)!).sort(byYearThenName);
  return (
    <ul class="space-y-0.5">
      {terms.map((it) => (
        <MoreTerm it={it} list={list} />
      ))}
    </ul>
  );
}

function MoreTerm({ it, list }: { it: TimelineEntry; list: MoreList }) {
  return (
    <li>
      <MoreTermLink it={it} list={list} />
    </li>
  );
}

/** A folded term, dated: picking it acts like clicking the term, then closes the list. */
function MoreTermLink({ it, list }: { it: TimelineEntry; list: MoreList }) {
  const { item } = useTimelineCtx();
  const pick = (e: MouseEvent) => {
    item(it).onClick(e);
    list.close();
  };
  return (
    <a
      href={it.href}
      class="flex items-baseline gap-2 rounded px-1.5 py-1 text-fg-soft hover:bg-surface-2 hover:text-fg"
      onClick={pick}
    >
      <span class="font-mono text-[10px] text-subtle">{it.year}</span>
      <span class={it.hub ? 'font-semibold' : ''}>{it.name}</span>
    </a>
  );
}

/** The selected term's summary: a preview on hover/focus, a dialog once pinned. */
export function TermPopover({ selection, byId }: { selection: Selection; byId: ById }) {
  const { sel } = selection;
  const it = sel && byId.get(sel.id);
  if (!sel || !it) return null;
  return <TermCard selection={selection} sel={sel} it={it} />;
}

type TermCardProps = { selection: Selection; sel: Sel; it: TimelineEntry };

/** The summary card for `it`; a pinned one has a close button. */
function TermCard({ selection, sel, it }: TermCardProps) {
  return (
    <Popover
      popRef={selection.popRef}
      pinned={sel.pinned}
      at={sel}
      aria-label={it.name}
      class="inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] p-4 text-sm sm:inset-x-auto sm:bottom-auto sm:w-80"
    >
      <TermSummary it={it} />
      <TermFooter it={it} onClose={sel.pinned ? selection.clear : undefined} />
    </Popover>
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

/** "Open term", and — on a pinned popover (`onClose` given) — a close button. */
function TermFooter({ it, onClose }: { it: TimelineEntry; onClose?: () => void }) {
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

/** The Explorer's term panel (A80) over the page, once its code has loaded. */
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
        {...panelCallbacks(panel.setId)}
      />
    </div>
  );
}
