import type { JSX } from 'preact';

/** A rounded pill button's classes: filled when active (on, open or pressed). */
export const chipClass = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs whitespace-nowrap focus-visible:outline-2 focus-visible:outline-(--focus) ${active ? 'border-border-hover bg-surface-2/80 text-fg' : 'border-border-strong text-muted hover:border-border-hover hover:text-fg-soft'}`;

type ChipProps = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'class'> & {
  /** Filled: the chip's option is on, or its popover is open. */
  active?: boolean;
  /** Extra classes after the chip's own (e.g. a tighter padding). */
  extra?: string;
};

/** A pill button (a toggle, a popover opener, a form action). A plain button by default. */
export function Chip({ active = false, extra, type = 'button', ...rest }: ChipProps) {
  const cls = extra ? `${chipClass(active)} ${extra}` : chipClass(active);
  return <button type={type} class={cls} {...rest} />;
}
