import type { ComponentChildren } from 'preact';

const HEADING = 'text-xs tracking-widest text-subtle uppercase';

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
