import type { ComponentChildren } from 'preact';
import { PopoverButton, PopoverPanel } from '../ui/Popover';
import { Domains, Find, Relationships, Route } from './BarControls';
import type { Section } from './use-explorer';
import { HEADING } from './styles';
import { ColourSegment, LayoutControl } from './ViewControls';

const SHEET =
  'absolute top-full left-1/2 z-20 mt-2 max-h-[70vh] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 space-y-4 overflow-y-auto rounded-xl p-3 text-xs text-fg-soft';

/** Phones (or a bar too tight for one row): every control in one "Controls" sheet. */
export function ControlsSheet({ p, x, note }: Section & { note: string }) {
  const open = x.bar.pop === 'sheet';
  return (
    <>
      <PopoverButton id="xp-sheet" open={open} onToggle={() => x.bar.setPop(open ? null : 'sheet')}>
        {p.ui.controls}
      </PopoverButton>
      {open && (
        <PopoverPanel id="xp-sheet" label={p.ui.controls} place={SHEET}>
          <SheetBody p={p} x={x} note={note} />
        </PopoverPanel>
      )}
    </>
  );
}

/** Find a term and the view first, then the titled groups. */
function SheetBody({ p, x, note }: Section & { note: string }) {
  return (
    <>
      <Find p={p} x={x} />
      <div class="flex flex-wrap gap-2">
        <LayoutControl ui={p.ui} controls={x.controls} />
      </div>
      {note && <p class="text-subtle">{note}</p>}
      <SheetSections p={p} x={x} />
    </>
  );
}

function SheetSections({ p, x }: Section) {
  return (
    <>
      <SheetSection heading={p.ui.colourBy}>
        <ColourSegment ui={p.ui} controls={x.controls} />
      </SheetSection>
      <SheetSection heading={p.ui.domains}>
        <Domains p={p} x={x} compact={false} />
      </SheetSection>
      <SheetSection heading={p.ui.relationshipTypes}>
        <Relationships p={p} x={x} />
      </SheetSection>
      <SheetSection heading={p.ui.route} tour="explorer-route">
        <Route p={p} x={x} />
      </SheetSection>
    </>
  );
}

type SectionProps = { heading: string; tour?: string; children: ComponentChildren };

/** A titled group of the sheet's controls. */
function SheetSection({ heading, tour, children }: SectionProps) {
  return (
    <section data-tour={tour}>
      <h2 class={HEADING}>{heading}</h2>
      {children}
    </section>
  );
}
