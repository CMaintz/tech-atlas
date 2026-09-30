// ---- Map themes (A92) --------------------------------------------------------------

/**
 * The map's two looks: a night map (bright hues on near-black) and a cream "paper" map
 * (deeper, more saturated shades of the same hues on warm off-white). Every colour
 * function takes a theme and defaults to dark, so server-rendered callers are unchanged.
 */
export type MapTheme = 'dark' | 'light';

/** Colours of everything on a map that is not a domain, cluster or family colour. */
export const MAP_INK: Record<
  MapTheme,
  {
    /** The 3D scene's background and fog (2D maps use the `--map-bg` CSS token). */
    bg3d: string;
    /** Term labels, and the halo round them that keeps them legible over edges. */
    label: string;
    halo: string;
    /** Year ticks, depth rows and other quiet map text (AA on the map background). */
    tick: string;
    /** The selected term's outline (2D) and fill (3D). */
    selected: string;
    /** Glow (dark) or soft shadow (light) round a term: colour (null = its own) and opacity. */
    underlay: string | null;
    underlayAlpha: number;
    /** A receded term in 3D. */
    faded3d: string;
    /** 3D hub labels: text and the blur behind it. */
    label3d: string;
    labelShadow3d: string;
    /** Knowledge colour of a term with no status yet. */
    unknown: string;
    /** Resting opacity of the 2D flow dots. */
    dotAlpha: number;
  }
> = {
  dark: {
    bg3d: '#05060b',
    label: '#e5e5e5',
    halo: '#0a0a0a',
    tick: '#a3a3a3',
    selected: '#ffffff',
    underlay: null,
    underlayAlpha: 0.2,
    faded3d: 'rgba(70,74,90,0.25)',
    label3d: '#e5e7eb',
    labelShadow3d: 'rgba(0,0,0,0.95)',
    unknown: '#404040',
    dotAlpha: 0.4,
  },
  light: {
    bg3d: '#f6f1e7',
    label: '#292524',
    halo: '#faf6ee',
    tick: '#57534e',
    selected: '#1c1917',
    underlay: '#57534e',
    underlayAlpha: 0.16,
    faded3d: 'rgba(168,160,146,0.35)',
    label3d: '#292524',
    labelShadow3d: 'rgba(250,246,238,1)',
    unknown: '#a8a29e',
    dotAlpha: 0.7,
  },
};

/** The darker of the two cream map backgrounds (the vignette's edge). */
export const CREAM = '#f6f1e7';
