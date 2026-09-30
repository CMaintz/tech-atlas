/** Class tokens of the Explorer's bar and panel, after the canvas lab's floating toolbar. */

/** A text field in the bar (find a term, the route's ends). */
export const FIELD =
  'w-full rounded-full border border-border-strong bg-surface px-3 py-1 text-xs text-fg placeholder:text-subtle';

/** A section heading in the phones' Controls sheet. */
export const HEADING = 'mb-1.5 text-[11px] tracking-widest text-subtle uppercase';

/** A map action in the term panel (neighbourhood, expand, whole map). */
export const actionClass = (active: boolean) =>
  `rounded border px-2 py-1 text-xs focus-visible:outline-2 focus-visible:outline-(--focus) ${active ? 'border-fg-soft text-fg' : 'border-border-strong text-fg-soft hover:border-border-hover hover:text-fg'}`;
