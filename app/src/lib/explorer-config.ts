/**
 * Every tunable number of the Explorer's look and motion, in one place (A79), so the
 * owner can iterate on the visuals without touching the code that uses them. Pure data.
 */
export const EXPLORER = {
  /** Node size (2D px / 3D radius scale) from PageRank: min at rank 0, max at the top. */
  node: {
    minSize: 9,
    maxSize: 44,
    /** Nodes at least this share of the top rank keep a label when zoomed out. */
    hubShare: 0.3,
  },

  /** Which edges the overview draws (A79): a backbone, not the hairball. */
  edges: {
    /** Strongest within-cluster relationships each term keeps in the overview. */
    backbonePerNode: 2,
    /** Resting opacity of backbone edges; revealed (hover/selection) edges are brighter. */
    restAlpha: 0.42,
    allAlpha: 0.22,
    /** Cluster-to-cluster bundles: fewer relationships than this are not drawn. */
    minBundle: 2,
    bundleAlpha: [0.07, 0.3] as [number, number],
    bundleWidth: [1.5, 11] as [number, number],
    /** How strongly "show all" cross-cluster edges bend towards their islands (0–1). */
    bundleBeta: 0.8,
  },

  /** Hover intent: the pointer must rest this long before the map re-styles. */
  hoverDelayMs: 45,

  /** Marching dashes on the hovered / selected / route edges only (A79). */
  flow: {
    /** Pixels per second the dash pattern moves, source → target. */
    speed: 7,
    dash: [3, 9] as [number, number],
    /** Repaint rate while something flows. */
    fps: 24,
  },

  motion: {
    /** Nodes glide to a new layout (force ↔ depth ↔ time, tidy up) over this long. */
    layoutMs: 700,
    /** Edges fade in / out when a relationship family is toggled. */
    fadeMs: 180,
    fitMs: 550,
  },

  /** 2D island map (A74) — gaps are in graph-style.ts (ISLAND_GAP, DOMAIN_GAP). */
  islands: {
    nodeRepulsion: 5200,
    idealEdgeLength: 58,
    minTermsForSystems: 60,
  },

  /** 2D "By depth": one lane per domain, depth rows, barycentric order inside rows. */
  depth: {
    colGap: 48,
    rowGap: 84,
    subRowGap: 30,
    laneGap: 150,
    /** A row wraps after roughly this × √(lane size) terms, keeping lanes compact. */
    wrapFactor: 1.9,
    sweeps: 4,
  },

  /** 2D "By time": x = year, one lane per domain; undated terms are hidden. */
  time: {
    pxPerYear: 44,
    /** Years before this are drawn compressed (few terms, long gaps). */
    compressBefore: 1980,
    compressFactor: 0.35,
    stackGap: 30,
    laneGap: 110,
    tickEvery: 10,
  },

  /** 3D "galaxies": one per domain on a ring, clusters as star systems, y ≈ depth. */
  three: {
    background: '#05060b',
    fogDensity: 0.00032,
    ringRadius: 900,
    clusterRadius: 250,
    /** Soft vertical bias per depth step (not a hard plane). */
    depthSpacing: 42,
    depthStrength: 0.05,
    /** Each term's target height is spread ± half this many depth steps. */
    depthJitter: 1.6,
    charge: 4200,
    chargeCutoff: 360,
    linkInCluster: 62,
    linkAcross: 260,
    springIn: 0.06,
    springAcross: 0.004,
    clusterPull: 0.03,
    domainPull: 0.02,
    ticks: 260,
    nodeRel: 3.2,
    glowScale: 24,
    glowOpacity: 0.5,
    linkAlpha: 0.2,
    hubLabels: 18,
    hubLabelHeight: 24,
    particleSpeed: 0.0022,
    particleWidth: 1.6,
    introMs: 2200,
  },
} as const;
