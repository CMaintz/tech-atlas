/** Class names shared by the canvas lab's floating toolbar and legend. */

/** A rounded toggle pill (domains, the relationship menu, Reset view). */
export const pill = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${active ? 'border-border-hover bg-surface-2/80 text-fg' : 'border-border-strong text-subtle hover:border-border-hover'}`;

/** One button of a segmented switch. */
export const seg = (active: boolean) =>
  `px-2.5 py-0.5 text-xs ${active ? 'bg-fg text-bg' : 'text-muted hover:text-fg'}`;

/** The frosted panel behind the toolbar, its popovers and the legend. */
export const bar = 'rounded-lg border border-border bg-bg/85 shadow-lg backdrop-blur';
