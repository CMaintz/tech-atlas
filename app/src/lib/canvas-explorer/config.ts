/** The canvas Explorer lab's shared numbers and the world-point type. */
export type Vec3 = { x: number; y: number; z: number };

/** Every tunable number of the lab's layout and look, in one place. */
export const LAB = {
  seed: 20260925,
  /** Region width = this × √(terms in the domain); height = width × regionAspect. */
  regionScale: 46,
  regionAspect: 0.6,
  /** Each term's target height is spread ± half this many tiers (a band, not a floor). */
  tierJitter: 1.3,
  /** How hard the relaxation pulls a term to its depth height (0–1 per step). */
  tierPull: 0.12,
  /** Gap between two nodes' rims after the spacing pass (world units). */
  gap: 6,
  /** Gap between domain regions. */
  domainGap: 110,
  /** Distance between rows of cluster seats, front to back (z). */
  clusterDepth: 170,
  /** Terms closer than this push apart during the relaxation. */
  repelRadius: 46,
  relaxSteps: 90,
  /** Node radius = this × the Explorer's PageRank size. */
  radiusScale: 0.42,
  /** Perspective focal length (world units) in Depth mode. */
  focal: 1500,
  /** Terms whose rank is at least this share of the top keep a label. */
  hubShare: 0.16,
  /** Alpha of everything not connected to the selection. */
  dimAlpha: 0.2,
  /** Spring constant and damping of the elastic snap-back (per second²/per second). */
  spring: { k: 170, damping: 15 },
  /** Seconds a pulse takes to cross an edge of 200 px; longer edges take longer. */
  pulseSeconds: 3.2,
} as const;
