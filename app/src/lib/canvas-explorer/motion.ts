/** Time-based motion in the canvas lab: the elastic snap-back and edge pulses. */
import { LAB } from './config';

/**
 * One step of the elastic snap-back: a damped spring pulling an offset to 0. Returns
 * the new offset and velocity; `dt` in seconds. Semi-implicit Euler (stable for small dt).
 */
export function springStep(
  offset: number,
  velocity: number,
  dt: number,
  k: number = LAB.spring.k,
  damping: number = LAB.spring.damping,
): [number, number] {
  const v = velocity + (-k * offset - damping * velocity) * dt;
  return [offset + v * dt, v];
}

/** True once a spring has come to rest (the loop can stop animating it). */
export const springAtRest = (offset: number, velocity: number) =>
  Math.abs(offset) < 0.05 && Math.abs(velocity) < 0.5;

/** Pulse position (0–1 along the edge) at `ms`, for an edge `len` px long, phase 0–1. */
export function pulseAt(ms: number, len: number, phase: number): number {
  const period = LAB.pulseSeconds * 1000 * Math.max(0.6, Math.sqrt(len / 200));
  return (ms / period + phase) % 1;
}

/** A stable 0–1 phase for an edge, so pulses don't march in lockstep. */
export function phaseOf(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}
