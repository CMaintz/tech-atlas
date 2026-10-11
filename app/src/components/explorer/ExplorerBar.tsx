import type { ComponentChildren } from 'preact';
import { GLASS } from '../ui/glass';
import { PopoverButton, PopoverPanel } from '../ui/Popover';
import { layoutNote } from '../../lib/explorer-view';
import { Domains, Find, Relationships, Route } from './BarControls';
import type { Section } from './use-explorer';
import { ControlsSheet } from './ControlsSheet';
import { ColourSegment, LayoutControl, ModeSegment } from './ViewControls';
import type { Pop } from './types';

export function ExplorerBar({ p, x }: Section) {
  const note = layoutNote(p.ui, x.controls, x.shown.undated);
  return (
    <div
      ref={x.bar.size.slot}
      class="pointer-events-none absolute top-3 right-14 left-14 z-20 flex flex-col items-center gap-1.5"
    >
      <ControlBar p={p} x={x} note={note} />
      {!x.bar.size.sheet && note && (
        <p class="max-w-2xl rounded-full bg-bg/70 px-3 py-0.5 text-center text-[11px] text-muted">
          {note}
        </p>
      )}
    </div>
  );
}

function ControlBar({ p, x, note }: Section & { note: string }) {
  const { size } = x.bar;
  return (
    <div
      ref={size.bar}
      data-size={size.sheet ? 'sheet' : size.size}
      role="group"
      aria-label={p.ui.mapControls}
      data-explorer-bar
      class={`pointer-events-auto relative flex max-w-full flex-nowrap items-center justify-center gap-1.5 rounded-2xl px-1.5 py-1.5 text-sm ${GLASS}`}
    >
      <ViewGroup p={p} x={x} />
      {size.sheet ? <ControlsSheet p={p} x={x} note={note} /> : <BarRow p={p} x={x} />}
    </div>
  );
}

function ViewGroup({ p, x }: Section) {
  return (
    <div class="flex shrink-0 items-center gap-1.5" data-tour="explorer-layouts">
      <ModeSegment ui={p.ui} controls={x.controls} />
      {!x.bar.size.sheet && <LayoutControl ui={p.ui} controls={x.controls} />}
    </div>
  );
}

function BarRow({ p, x }: Section) {
  return (
    <>
      <Domains p={p} x={x} compact={x.bar.size.size !== 'full'} wrap={false} />
      <LinksPopover p={p} x={x} />
      <ColourSegment ui={p.ui} controls={x.controls} />
      <Find p={p} x={x} />
      <RoutePopover p={p} x={x} />
    </>
  );
}

function LinksPopover({ p, x }: Section) {
  const label = x.bar.size.size === 'compact' ? p.ui.linksShort : p.ui.relationshipTypes;
  const name = p.ui.relationshipTypes;
  return (
    <BarPopover x={x} pop="links" buttonLabel={label} panelName={name} active={x.filters.showAll}>
      <Relationships p={p} x={x} />
    </BarPopover>
  );
}

function RoutePopover({ p, x }: Section) {
  const routed = x.route.highlight.length > 0 && !!x.route.message;
  const { routeShort, route } = p.ui;
  return (
    <BarPopover
      x={x}
      pop="route"
      buttonLabel={routeShort}
      panelName={route}
      active={routed}
      alignRight
    >
      <Route p={p} x={x} />
    </BarPopover>
  );
}

type PopProps = Pick<Section, 'x'> & {
  pop: Pop;
  buttonLabel: string;
  panelName: string;
  active: boolean;
  alignRight?: boolean;
  children: ComponentChildren;
};

const popPlace = (alignRight?: boolean) =>
  `absolute top-full ${alignRight ? 'right-0' : 'left-0'} z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl p-3 text-xs text-fg-soft`;

function BarPopover({ x, pop, buttonLabel, panelName, active, alignRight, children }: PopProps) {
  const open = x.bar.pop === pop;
  const toggle = () => x.bar.setPop(open ? null : pop);
  return (
    <div class="relative shrink-0" data-tour={pop === 'route' ? 'explorer-route' : undefined}>
      <PopoverButton id={`xp-${pop}`} open={open} active={active} onToggle={toggle}>
        {buttonLabel}
      </PopoverButton>
      {open && (
        <PopoverPanel id={`xp-${pop}`} label={panelName} place={popPlace(alignRight)}>
          {children}
        </PopoverPanel>
      )}
    </div>
  );
}
