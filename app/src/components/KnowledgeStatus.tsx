import { useEffect, useState } from 'preact/hooks';
import { STATUSES, loadLearner, saveLearner, setStatus, type Status } from '../lib/learner';

interface Props {
  termId: string;
  ui: Record<string, string>;
}

const ACTIVE: Record<Status, string> = {
  know: 'border-green-600 text-green-800 dark:border-green-500 dark:text-green-300',
  familiar: 'border-lime-600 text-lime-800 dark:border-lime-500 dark:text-lime-300',
  learning: 'border-amber-600 text-amber-800 dark:border-amber-500 dark:text-amber-300',
  unknown: 'border-red-600 text-red-700 dark:border-red-500 dark:text-red-300',
};

function useTermStatus(termId: string) {
  const [status, setLocal] = useState<Status | undefined>(undefined);
  useEffect(() => {
    const refresh = () => setLocal(loadLearner().terms[termId]?.status);
    refresh();
    window.addEventListener('atlas:learner', refresh);
    return () => window.removeEventListener('atlas:learner', refresh);
  }, [termId]);
  const choose = (s: Status) => {
    const next = status === s ? undefined : s;
    saveLearner(setStatus(loadLearner(), { id: termId, status: next }));
    setLocal(next);
  };
  return { status, choose };
}

type StatusButtonProps = {
  s: Status;
  active: boolean;
  label: string;
  onChoose: (s: Status) => void;
};

function StatusButton({ s, active, label, onChoose }: StatusButtonProps) {
  return (
    <button
      class={`min-h-11 rounded border px-3 py-1 text-sm sm:min-h-0 sm:px-2 sm:text-xs ${active ? ACTIVE[s] : 'border-border-strong text-muted hover:border-border-hover'}`}
      aria-pressed={active}
      onClick={() => onChoose(s)}
    >
      {label}
    </button>
  );
}

export default function KnowledgeStatus({ termId, ui }: Props) {
  const { status, choose } = useTermStatus(termId);
  return (
    <div>
      <p class="mb-2 text-sm text-muted">{ui.statusQuestion}</p>
      <div class="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <StatusButton s={s} active={status === s} label={ui[`status_${s}`]} onChoose={choose} />
        ))}
      </div>
    </div>
  );
}
