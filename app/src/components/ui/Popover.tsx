import type { ComponentChildren } from 'preact';
import { Chip } from './Chip';
import { GLASS } from './glass';

interface ButtonProps {
  /** The popover's element id (the button's aria-controls). */
  id: string;
  open: boolean;
  /** Filled while closed too (e.g. its option is on). */
  active?: boolean;
  onToggle: () => void;
  children: ComponentChildren;
}

/** A pill that opens and closes a popover, with a ▾ after its label. */
export function PopoverButton({ id, open, active = false, onToggle, children }: ButtonProps) {
  return (
    <Chip active={active || open} aria-expanded={open} aria-controls={id} onClick={onToggle}>
      {children} <span aria-hidden="true">▾</span>
    </Chip>
  );
}

interface PanelProps {
  id: string;
  /** The panel's accessible name. */
  label: string;
  /** Placement and size classes (the frosted surface is added). */
  place: string;
  children: ComponentChildren;
}

/**
 * A popover's panel. `data-map-popover` tells the term panel's Esc handler to stand down
 * while it is open.
 */
export function PopoverPanel({ id, label, place, children }: PanelProps) {
  return (
    <div id={id} role="group" aria-label={label} data-map-popover class={`${place} ${GLASS}`}>
      {children}
    </div>
  );
}
