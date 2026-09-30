import type { ComponentChildren } from 'preact';

const HEADING = 'text-xs tracking-widest text-subtle uppercase';

/** A panel section's small-caps heading; `spacing` is its bottom margin (e.g. `mb-2`). */
export default function PanelHeading(p: {
  spacing?: string;
  id?: string;
  children: ComponentChildren;
}) {
  return (
    <h3 id={p.id} class={p.spacing ? `${p.spacing} ${HEADING}` : HEADING}>
      {p.children}
    </h3>
  );
}
