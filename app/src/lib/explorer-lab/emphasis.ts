/** The visual lab's (A96) emphasis by importance: how much each edge matters, and how. */
import type { EdgeType } from '../../schema';

/** How an edge's importance shows: off (today), opacity, colour, width, or all three. */
export type Emphasis = 'off' | 'opacity' | 'colour' | 'width' | 'combined';
export const EMPHASES: readonly Emphasis[] = ['off', 'opacity', 'colour', 'width', 'combined'];

/** Which channels an emphasis mode drives ("combined" drives all three). */
export const emphasisChannels = (emph: Emphasis) => ({
  alpha: emph === 'opacity' || emph === 'combined',
  colour: emph === 'colour' || emph === 'combined',
  width: emph === 'width' || emph === 'combined',
});

/**
 * How much each relationship type matters on the map (the owner's default ranking):
 * structure first, then cause and effect, then lineage, then comparisons and "used with".
 */
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

/**
 * Each link's importance in [0, 1]: its type's weight × its own weight (graph.json's
 * `weight` already folds in strength, confidence and degree), normalised to the heaviest
 * link and softened (square root) so a few hubs do not flatten everything else.
 */
export function importance(links: readonly { type: EdgeType; weight: number }[]): number[] {
  const top = Math.max(1e-9, ...links.map((l) => l.weight));
  return links.map((l) => TYPE_IMPORTANCE[l.type] * Math.sqrt(Math.max(0, l.weight) / top));
}

/**
 * Intensity in [0, 1] for an importance: `spread` 0 makes every edge 1 (no contrast);
 * higher values push unimportant edges further down (importance ^ spread).
 */
export const intensity = (imp: number, spread: number) =>
  Math.min(1, Math.max(0, imp)) ** Math.max(0, spread);

/** An opacity multiplier for an intensity: 0.15 × at the bottom, 1.8 × at the top. */
export const alphaGain = (k: number) => 0.15 + 1.65 * k;

/** A line width multiplier for an intensity: 0.4 × at the bottom, 2.2 × at the top. */
export const widthGain = (k: number) => 0.4 + 1.8 * k;
