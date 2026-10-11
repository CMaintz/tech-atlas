export type FrameStats = {
  fps: number;
  low: number;
  longest: number;
};

export function frameStats(times: readonly number[]): FrameStats {
  if (times.length < 2) return { fps: 0, low: 0, longest: 0 };
  const now = times[times.length - 1];
  const dts: number[] = [];
  for (let i = 1; i < times.length; i++) dts.push(times[i] - times[i - 1]);
  const lastSecond = times.filter((t) => t > now - 1000).length;
  const sorted = [...dts].sort((a, b) => a - b);
  const p99 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];
  return {
    fps: lastSecond,
    low: Math.round(1000 / (p99 || 1)),
    longest: Math.round(sorted[sorted.length - 1]),
  };
}

export function averageFps(times: readonly number[]): number {
  if (times.length < 2) return 0;
  const span = times[times.length - 1] - times[0];
  return span > 0 ? Math.round(((times.length - 1) * 1000) / span) : 0;
}

export function benchReport(view: string, times: readonly number[], active: readonly string[]) {
  const { low, longest } = frameStats(times);
  const toggles = active.join(' ') || 'defaults';
  return { view, fps: averageFps(times), low, longest, toggles };
}
