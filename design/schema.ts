/**
 * Pointer, not a copy. The Term schema lives in one place:
 *
 *     app/src/schema.ts
 *
 * That file is what the lint, the build and the site validate content against.
 * This file used to be a hand-kept copy of it, and the two drifted apart
 * (DECISIONS_REVIEW U37, decision A66). It now re-exports the real schema, so
 * links from SPEC.md, UNIFIED_VISION.md and the ADRs still land on something true.
 *
 * Derived, build-time data (depth, inverse edges, Mentions, visual weight) is
 * typed in app/src/lib/graph-model.ts.
 */
export * from '../app/src/schema';
