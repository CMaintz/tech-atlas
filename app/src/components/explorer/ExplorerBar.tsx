import type { ComponentChildren } from 'preact';
import { GLASS } from '../ui/glass';
import { PopoverButton, PopoverPanel } from '../ui/Popover';
import { layoutNote } from '../../lib/explorer-view';
import { Domains, Find, Relationships, Route } from './BarControls';
import type { Section } from './use-explorer';
import { ControlsSheet } from './ControlsSheet';
import { ColourSegment, LayoutControl, ModeSegment } from './ViewControls';
import type { Pop } from './types';

/**
 * The control bar: one compact row (dot-only domain chips, a search icon) centred over
 * the top of the map. Equal insets keep it clear of the collapsed legend (top-left,
 * also in Danish) and the About "i" (top-right); while the legend is open the bar
 * sits right of it. It never moves when the term panel opens, which simply sits above
 * it. On phones it condenses to 2D/3D and a "Controls" sheet, and the legend sits
 * below it.
 */
export function ExplorerBar({ p, x }: Section) {
  const note = layoutNote(p.ui, x.controls.mode, x.controls.layout, x.shown.undated);
  const left = x.bar.legend.open ? 'md:left-(--xp-legend-open)' : 'md:left-(--xp-legend)';
  return (
    <div
      ref={x.bar.size.slot}
      class={`pointer-events-none absolute top-3 right-14 left-14 z-20 flex flex-col items-center gap-1.5 md:right-36 ${left}`}
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

/** The bar itself: 2D/3D and the layouts, then the row's controls or the sheet. */
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

/** 2D/3D, and (outside the sheet) the layouts or auto-rotate. */
function ViewGroup({ p, x }: Section) {
  return (
    <div class="flex shrink-0 items-center gap-1.5" data-tour="explorer-layouts">
      <ModeSegment ui={p.ui} controls={x.controls} />
      {!x.bar.size.sheet && <LayoutControl ui={p.ui} controls={x.controls} />}
    </div>
  );
}

/** The desktop row: domains, relationship types, colouring, find, route. */
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

/** Relationship types: a short label in a compact bar; filled while "show all" is on. */
function LinksPopover({ p, x }: Section) {
  const label = x.bar.size.size === 'compact' ? p.ui.linksShort : p.ui.relationshipTypes;
  const name = p.ui.relationshipTypes;
  return (
    <BarPopover x={x} pop="links" label={label} name={name} active={x.filters.showAll}>
      <Relationships p={p} x={x} />
    </BarPopover>
  );
}

/** Route between two terms: filled while a found route is lit. */
function RoutePopover({ p, x }: Section) {
  const routed = x.route.highlight.length > 0 && !!x.route.message;
  const { routeShort, route } = p.ui;
  return (
    <BarPopover x={x} pop="route" label={routeShort} name={route} active={routed} right>
      <Route p={p} x={x} />
    </BarPopover>
  );
}

type PopProps = Pick<Section, 'x'> & {
  pop: Pop;
  /** The button's label. */
  label: string;
  /** The panel's accessible name. */
  name: string;
  active: boolean;
  /** Align the panel to the button's right edge (else its left). */
  right?: boolean;
  children: ComponentChildren;
};

const popPlace = (right?: boolean) =>
  `absolute top-full ${right ? 'right-0' : 'left-0'} z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl p-3 text-xs text-fg-soft`;

/** A bar button and, while open, its popover under it. The tour points at the route's. */
function BarPopover({ x, pop, label, name, active, right, children }: PopProps) {
  const open = x.bar.pop === pop;
  const toggle = () => x.bar.setPop(open ? null : pop);
  return (
    <div class="relative shrink-0" data-tour={pop === 'route' ? 'explorer-route' : undefined}>
      <PopoverButton id={`xp-${pop}`} open={open} active={active} onToggle={toggle}>
        {label}
      </PopoverButton>
      {open && (
        <PopoverPanel id={`xp-${pop}`} label={name} place={popPlace(right)}>
          {children}
        </PopoverPanel>
      )}
    </div>
  );
}
