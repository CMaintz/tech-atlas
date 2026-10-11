export type MapTheme = 'dark' | 'light';

export const MAP_INK: Record<
  MapTheme,
  {
    bg3d: string;
    label: string;
    halo: string;
    tick: string;
    selected: string;
    underlay: string | null;
    underlayAlpha: number;
    faded3d: string;
    label3d: string;
    labelShadow3d: string;
    unknown: string;
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

export const CREAM = '#f6f1e7';
