/**
 * The visual lab's frame meter and scripted benchmark. The meter records every
 * animation frame's timestamp over the last five seconds; a benchmark run also collects
 * its own frames and reports them as JSON.
 */
import { useEffect, useRef, useState, type MutableRef } from 'preact/hooks';
import { benchReport, frameStats } from '../../lib/explorer-lab';
import { orbit, panZoom, type Motion } from './motion';
import type { Text } from './text';
import type { Maps } from './use-visual-lab';

const BENCH_MS = 5000;
/** Frames the meter keeps (the last five seconds). */
const WINDOW_MS = 5000;

/** The meter's text node (written directly, four times a second) and the bench's frames. */
export function useFrameMeter(t: Text) {
  const meter = useRef<HTMLParagraphElement>(null);
  const bench = useRef<number[] | null>(null);
  useEffect(() => {
    const frames: number[] = [];
    let shown = 0;
    return everyFrame((now) => {
      frames.push(now);
      while (frames.length && frames[0] < now - WINDOW_MS) frames.shift();
      bench.current?.push(now);
      if (now - shown < 250 || !meter.current) return;
      shown = now;
      const st = frameStats(frames);
      meter.current.textContent = `${st.fps} ${t.fps} · ${t.low} ${st.low} · ${t.longest} ${st.longest} ms`;
    });
  }, [t]);
  return { meter, bench };
}

/** Call `fn` on every animation frame; returns the stop. */
function everyFrame(fn: (now: number) => void) {
  let raf = 0;
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    fn(now);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

type BenchInput = {
  view: '2d' | '3d';
  maps: Maps;
  ready: boolean;
  active: string[];
  bench: MutableRef<number[] | null>;
};

/** Run the scripted motion for five seconds; `?bench=1` runs it once the map settles. */
export function useBenchmark(p: BenchInput) {
  const [result, setResult] = useState<string>('');
  const [running, setRunning] = useState(false);
  const runBench = () => {
    const move = running ? null : scripted(p.view, p.maps);
    if (!move) return;
    setRunning(true);
    setResult('');
    p.bench.current = [];
    play(move, () => {
      const times = p.bench.current ?? [];
      p.bench.current = null;
      setResult(JSON.stringify(benchReport(p.view, times, p.active)));
      setRunning(false);
    });
  };
  useAutoBench(p, runBench);
  return { result, running, runBench };
}

/** The view's scripted motion (a pan and zoom in 2D, an orbit in 3D), once it is built. */
const scripted = (view: '2d' | '3d', maps: Maps) =>
  view === '2d' ? maps.map2d?.cy && panZoom(maps.map2d.cy) : maps.map3d && orbit(maps.map3d);

/** Play a motion over BENCH_MS on animation frames, restore it, then call `done`. */
function play(move: Motion, done: () => void) {
  const start = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - start) / BENCH_MS);
    move.at(k);
    if (k < 1) return void requestAnimationFrame(step);
    move.done();
    done();
  };
  requestAnimationFrame(step);
}

/** `?bench=1` runs the benchmark once the map has settled (for headless runs). */
function useAutoBench(p: BenchInput, runBench: () => void) {
  const autoBench = useRef(new URLSearchParams(window.location.search).get('bench') === '1');
  useEffect(() => {
    if (!p.ready || !autoBench.current) return;
    autoBench.current = false;
    const id = window.setTimeout(runBench, p.view === '2d' ? 3000 : 4000);
    return () => window.clearTimeout(id);
  }, [p.ready]);
}
