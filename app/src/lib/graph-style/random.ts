/** Seeded randomness, so the same map always settles the same way. */

/** A small, fast, seedable PRNG (mulberry32). */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The fixed seed every layout uses, so the same map always settles the same way. */
export const LAYOUT_SEED = 20260925;

/**
 * Run a synchronous computation with `Math.random` replaced by a seeded PRNG. Layout
 * libraries (fcose's spectral step) draw from `Math.random`; seeding it makes the map
 * deterministic. Always restored, even if `fn` throws.
 */
export function withSeededRandom<T>(seed: number, fn: () => T): T {
  const original = Math.random;
  Math.random = seededRandom(seed);
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}
