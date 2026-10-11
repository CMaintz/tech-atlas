export const BAR_FIELD =
  'w-full rounded-full border border-border-strong bg-surface px-3 py-1 text-xs text-fg placeholder:text-subtle';

export const SHEET_HEADING = 'mb-1.5 text-[11px] tracking-widest text-subtle uppercase';

export const actionClass = (active: boolean) =>
  `rounded border px-2 py-1 text-xs focus-visible:outline-2 focus-visible:outline-(--focus) ${active ? 'border-fg-soft text-fg' : 'border-border-strong text-fg-soft hover:border-border-hover hover:text-fg'}`;
