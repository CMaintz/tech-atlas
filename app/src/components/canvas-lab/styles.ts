export const togglePill = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${active ? 'border-border-hover bg-surface-2/80 text-fg' : 'border-border-strong text-subtle hover:border-border-hover'}`;

export const switchSegment = (active: boolean) =>
  `px-2.5 py-0.5 text-xs ${active ? 'bg-fg text-bg' : 'text-muted hover:text-fg'}`;

export const frostedPanel = 'rounded-lg border border-border bg-bg/85 shadow-lg backdrop-blur';
