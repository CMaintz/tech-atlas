import { LAB } from './config';

export function springStep(offset: number, velocity: number, dt: number): [number, number] {
  const { k, damping } = LAB.spring;
  const v = velocity + (-k * offset - damping * velocity) * dt;
  return [offset + v * dt, v];
}

export const springAtRest = (offset: number, velocity: number) =>
  Math.abs(offset) < 0.05 && Math.abs(velocity) < 0.5;

export function pulseAt(ms: number, len: number, phase: number): number {
  const period = LAB.pulseSeconds * 1000 * Math.max(0.6, Math.sqrt(len / 200));
  return (ms / period + phase) % 1;
}

export function phaseOf(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}
