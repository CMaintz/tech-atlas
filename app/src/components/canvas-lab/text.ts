import type { MapTheme } from '../../lib/graph-style';

export type Lang = 'en' | 'da';
export type Dict = Record<string, string>;

/** The lab's own strings (A91): a hidden test page, so they stay out of site.ts. */
export const TEXT: Record<Lang, Dict> = {
  en: {
    title: 'Canvas lab',
    intro:
      'A test page: the same map drawn by a small hand-written canvas renderer, to compare with the Explorer. Not linked from the site.',
    flat: 'Flat',
    depth: 'Depth',
    spin: 'Slow auto-rotate',
    edges: 'Edges',
    backbone: 'Backbone',
    all: 'All',
    search: 'Find a term',
    fit: 'Reset view',
    hintFlat: 'Drag to pan · wheel to zoom · pull a node and let go',
    hintDepth: 'Drag to orbit · Shift+drag to pan · wheel to zoom · pull a node and let go',
    compare: 'Open the Explorer',
    noMatch: 'No match',
    pulses:
      'Moving dots: a one-way relationship, travelling from a term to what it requires, mitigates, causes …',
  },
  da: {
    title: 'Canvas-lab',
    intro:
      'En testside: det samme kort tegnet af en lille håndskrevet canvas-renderer, til sammenligning med Udforskeren. Der linkes ikke hertil fra sitet.',
    flat: 'Flad',
    depth: 'Dybde',
    spin: 'Langsom automatisk rotation',
    edges: 'Kanter',
    backbone: 'Rygrad',
    all: 'Alle',
    search: 'Find et begreb',
    fit: 'Nulstil visning',
    hintFlat: 'Træk for at panorere · hjul for at zoome · træk i en knude og slip',
    hintDepth:
      'Træk for at dreje · Shift+træk for at panorere · hjul for at zoome · træk i en knude og slip',
    compare: 'Åbn Udforskeren',
    noMatch: 'Intet match',
    pulses:
      'Bevægelige prikker: en envejsrelation, der løber fra et begreb mod det, det forudsætter, afbøder, forårsager …',
  },
};

/** What the canvas paints besides term and family colours. */
export type Ink = {
  ring: string;
  outline: string;
  sel: string;
  hover: string;
  halo: string;
  big: string;
  text: string;
  glow: number;
};

/** The canvas's ink per map theme (A92). */
export const LAB_INK: Record<MapTheme, Ink> = {
  dark: {
    ring: 'rgba(255,255,255,0.75)',
    outline: 'rgba(5,6,11,0.55)',
    sel: '#ffffff',
    hover: 'rgba(255,255,255,0.7)',
    halo: 'rgba(5,6,11,0.9)',
    big: '#ffffff',
    text: '#d4d4d8',
    glow: 1,
  },
  light: {
    ring: 'rgba(250,246,238,0.9)',
    outline: 'rgba(41,37,36,0.35)',
    sel: '#1c1917',
    hover: 'rgba(28,25,23,0.6)',
    halo: 'rgba(250,246,238,0.92)',
    big: '#1c1917',
    text: '#292524',
    // A glow reads as a smudge on paper: a fainter, soft shadow instead.
    glow: 0.45,
  },
};
