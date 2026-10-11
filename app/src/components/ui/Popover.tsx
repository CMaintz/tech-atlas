import type { ComponentChildren } from 'preact';
import { Chip } from './Chip';
import { GLASS } from './glass';

interface ButtonProps {
  id: string;
  open: boolean;
  active?: boolean;
  onToggle: () => void;
  children: ComponentChildren;
}

export function PopoverButton({ id, open, active = false, onToggle, children }: ButtonProps) {
  return (
    <Chip active={active || open} aria-expanded={open} aria-controls={id} onClick={onToggle}>
      {children} <span aria-hidden="true">▾</span>
    </Chip>
  );
}

interface PanelProps {
  id: string;
  label: string;
  place: string;
  children: ComponentChildren;
}

export function PopoverPanel({ id, label, place, children }: PanelProps) {
  return (
    <div id={id} role="group" aria-label={label} data-map-popover class={`${place} ${GLASS}`}>
      {children}
    </div>
  );
}
