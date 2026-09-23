import { useEffect, useState } from 'preact/hooks';
import { STATUSES, loadLearner, saveLearner, setStatus, type Status } from '../lib/learner';

interface Props {
  termId: string;
  ui: Record<string, string>;
}

const ACTIVE: Record<Status, string> = {
  know: 'border-green-500 text-green-300',
  familiar: 'border-lime-500 text-lime-300',
  learning: 'border-amber-500 text-amber-300',
  unknown: 'border-red-500 text-red-300',
};

/** Self-assessment for one term — feeds the personal knowledge map and recommendations. */
export default function KnowledgeStatus({ termId, ui }: Props) {
  const [status, setLocal] = useState<Status | undefined>(undefined);
  useEffect(() => {
    // Also refresh when progress changes elsewhere (e.g. merged in from another device).
    const refresh = () => setLocal(loadLearner().terms[termId]?.status);
    refresh();
    window.addEventListener('atlas:learner', refresh);
    return () => window.removeEventListener('atlas:learner', refresh);
  }, [termId]);

  const choose = (s: Status) => {
    const next = status === s ? undefined : s;
    saveLearner(setStatus(loadLearner(), termId, next));
    setLocal(next);
  };

  return (
    <div>
      <p class="mb-2 text-sm text-neutral-400">{ui.statusQuestion}</p>
      <div class="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            class={`rounded border px-2 py-1 text-xs ${status === s ? ACTIVE[s] : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}
            aria-pressed={status === s}
            onClick={() => choose(s)}
          >
            {ui[`status_${s}`]}
          </button>
        ))}
      </div>
    </div>
  );
}
