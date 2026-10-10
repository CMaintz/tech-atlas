import type { EdgeType } from '../../schema';

export type Emphasis = 'off' | 'opacity' | 'colour' | 'width' | 'combined';
export const EMPHASES: readonly Emphasis[] = ['off', 'opacity', 'colour', 'width', 'combined'];

export const emphasisChannels = (emph: Emphasis) => ({
  alpha: emph === 'opacity' || emph === 'combined',
  colour: emph === 'colour' || emph === 'combined',
  width: emph === 'width' || emph === 'combined',
});

export const TYPE_IMPORTANCE: Record<EdgeType, number> = {
  requires: 1,
  'kind-of': 1,
  'part-of': 1,
  mitigates: 0.85,
  exploits: 0.85,
  causes: 0.85,
  mandates: 0.85,
  implements: 0.7,
  supersedes: 0.7,
  'contrasts-with': 0.5,
  'alternative-to': 0.5,
  'used-with': 0.35,
};

export function importance(links: readonly { type: EdgeType; weight: number }[]): number[] {
  const top = Math.max(1e-9, ...links.map((l) => l.weight));
  return links.map((l) => TYPE_IMPORTANCE[l.type] * Math.sqrt(Math.max(0, l.weight) / top));
}

export const intensity = (imp: number, spread: number) =>
  Math.min(1, Math.max(0, imp)) ** Math.max(0, spread);

export const alphaGain = (k: number) => 0.15 + 1.65 * k;

export const widthGain = (k: number) => 0.4 + 1.8 * k;
