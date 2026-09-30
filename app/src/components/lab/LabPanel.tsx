/** The visual lab's (A96) floating panel: title, frame meter, benchmark, toggles. */
import { useState } from 'preact/hooks';
import Controls2D from './Controls2D';
import Controls3D from './Controls3D';
import type { VisualLab } from './use-visual-lab';

type P = { lab: VisualLab };

export default function LabPanel({ lab }: P) {
  const [open, setOpen] = useState(true);
  return (
    <div
      class="absolute right-3 bottom-3 z-30 w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border border-border bg-bg/90 p-3 text-xs text-fg-soft shadow-lg shadow-black/15 backdrop-blur dark:shadow-black/40"
      role="group"
      aria-label={lab.t.title}
      data-lab-panel
    >
      <Header lab={lab} open={open} toggle={() => setOpen(!open)} />
      <Status lab={lab} />
      {open && <Controls lab={lab} />}
    </div>
  );
}

/** The title and view, and Hide / Show lab. */
function Header({ lab, open, toggle }: P & { open: boolean; toggle: () => void }) {
  const { t, view } = lab;
  return (
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-[11px] tracking-widest text-muted uppercase">
        {t.title} · {view.toUpperCase()}
      </h2>
      <button
        type="button"
        class="rounded-full border border-border-strong px-2 py-0.5 text-muted hover:text-fg"
        aria-expanded={open}
        onClick={toggle}
      >
        {open ? t.hide : t.show}
      </button>
    </div>
  );
}

/** The frame meter, the benchmark button and its result, and the active toggles. */
function Status({ lab }: P) {
  const { t } = lab;
  return (
    <>
      <p class="mt-1.5 font-mono text-fg" ref={lab.meter} aria-label={t.meter}>
        -
      </p>
      <Bench lab={lab} />
      <p class="mt-1.5 text-muted">
        {t.active}: <span class="text-fg-soft">{lab.active.join(', ') || t.defaults}</span>
      </p>
    </>
  );
}

/** Run the scripted benchmark (disabled until the map is built, or while running). */
function Bench({ lab }: P) {
  const { t, view } = lab;
  const { result, running, runBench } = lab.bench;
  return (
    <div class="mt-1.5 flex items-center gap-2">
      <button
        type="button"
        class="rounded-full border border-border-hover bg-surface-2/80 shrink-0 px-2.5 py-1 whitespace-nowrap text-fg disabled:opacity-50"
        disabled={running || !lab.ready}
        title={view === '2d' ? t.benchPan : t.benchOrbit}
        onClick={runBench}
      >
        {running ? t.running : t.bench}
      </button>
      {result && <BenchResult lab={lab} result={result} />}
    </div>
  );
}

/** The last run's average fps and 1% low (its full JSON in `data-lab-result`). */
function BenchResult({ lab, result }: P & { result: string }) {
  const { t } = lab;
  const res = JSON.parse(result) as { fps: number; low: number };
  return (
    <span class="font-mono text-amber-700 dark:text-amber-200" data-lab-result={result}>
      {res.fps} {t.fps} {t.average} · {t.low} {res.low}
    </span>
  );
}

/** This view's toggles, scrolling inside the panel. */
function Controls({ lab }: P) {
  return (
    <div class="mt-2 max-h-[50vh] space-y-2 overflow-y-auto border-t border-border pt-2">
      {lab.view === '2d' ? (
        <Controls2D s={lab.s2} set={lab.setS2} t={lab.t} />
      ) : (
        <Controls3D s={lab.s3} set={lab.setS3} t={lab.t} />
      )}
    </div>
  );
}
