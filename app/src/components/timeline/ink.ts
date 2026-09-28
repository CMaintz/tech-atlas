type Dict = Record<string, string>;

/** A colour on both maps: night (`d`) and cream (`l`). */
export type Ink = { d: string; l: string };

/**
 * CSS custom properties for a `.map-ink` element (global.css): it paints with
 * `var(--ink)` (and `var(--ink2)`), which follows the theme with no script, so the
 * server-rendered chart is right before it hydrates.
 */
export const inkVars = (ink: Ink, ink2?: Ink | null) =>
  `--ink-d:${ink.d};--ink-l:${ink.l};` + (ink2 ? `--ink2-d:${ink2.d};--ink2-l:${ink2.l};` : '');

/** A domain's colour on both maps (by its night and cream palettes); grey for an unknown one. */
export const inkOf =
  (night: Dict, cream: Dict) =>
  (d: string | undefined): Ink =>
    d && night[d] ? { d: night[d], l: cream[d] ?? night[d] } : { d: '#a3a3a3', l: '#57534e' };
