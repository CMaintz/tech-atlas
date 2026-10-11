export type Vec3 = { x: number; y: number; z: number };

export const LAB = {
  seed: 20260925,
  regionScale: 46,
  regionAspect: 0.6,
  tierJitter: 1.3,
  tierPull: 0.12,
  gap: 6,
  domainGap: 110,
  clusterDepth: 170,
  repelRadius: 46,
  relaxSteps: 90,
  radiusScale: 0.42,
  focal: 1500,
  hubShare: 0.16,
  dimAlpha: 0.2,
  spring: { k: 170, damping: 15 },
  pulseSeconds: 3.2,
} as const;
