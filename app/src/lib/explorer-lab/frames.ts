/** Frame-time statistics for the visual lab's (A96) meter and benchmark. */
export type FrameStats = {
  /** Frames drawn in the last second. */
  fps: number;
  /** The frame rate of the slowest 1 % of frames (1000 / 99th-percentile frame time). */
  low: number;
  /** The longest frame, in ms. */
  longest: number;
};

/**
 * Statistics over frame timestamps (ms, ascending): the frame rate over the last second,
 * the 1 % low and the longest frame over the whole window.
 */
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

/** Average frame rate of a run: frames after the first over the time they took. */
export function averageFps(times: readonly number[]): number {
  if (times.length < 2) return 0;
  const span = times[times.length - 1] - times[0];
  return span > 0 ? Math.round(((times.length - 1) * 1000) / span) : 0;
}

/** A benchmark run's result: view, average fps, 1 % low, longest frame, active toggles. */
export function benchReport(view: string, times: readonly number[], active: readonly string[]) {
  const { low, longest } = frameStats(times);
  const toggles = active.join(' ') || 'defaults';
  return { view, fps: averageFps(times), low, longest, toggles };
}
