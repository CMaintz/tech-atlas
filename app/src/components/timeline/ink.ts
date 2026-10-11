type Dict = Record<string, string>;

export type Ink = { d: string; l: string };

export const inkVars = (ink: Ink, ink2?: Ink | null) =>
  `--ink-d:${ink.d};--ink-l:${ink.l};` + (ink2 ? `--ink2-d:${ink2.d};--ink2-l:${ink2.l};` : '');

export const inkOf =
  (night: Dict, cream: Dict) =>
  (d: string | undefined): Ink =>
    d && night[d] ? { d: night[d], l: cream[d] ?? night[d] } : { d: '#a3a3a3', l: '#57534e' };

export const alternateDecadeShade = (i: number) =>
  i % 2 ? 'color-mix(in srgb, var(--fg) 4.5%, transparent)' : 'transparent';
