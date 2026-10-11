import { useEffect, useState } from 'preact/hooks';
import { RECENT_KEY, parseRecent } from '../lib/prefs';

interface Props {
  names: Record<string, string>;
  termBase: string;
  ui: { recentlyViewed: string; clearRecent: string };
}

function storedRecentIds(names: Record<string, string>): string[] {
  try {
    return parseRecent(localStorage.getItem(RECENT_KEY)).filter((id) => id in names);
  } catch {
    return [];
  }
}

function useRecentIds(names: Record<string, string>) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => setIds(storedRecentIds(names)), []);
  const clear = () => {
    setIds([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      return;
    }
  };
  return { ids, clear };
}

type ListProps = Pick<Props, 'names' | 'termBase'> & { ids: string[] };

const RecentLink = ({ id, names, termBase }: Omit<ListProps, 'ids'> & { id: string }) => (
  <a
    class="inline-flex min-h-11 items-center rounded border border-border px-2 py-1 text-sm sm:min-h-0 text-fg-soft hover:border-border-hover hover:text-fg"
    href={`${termBase}${id}/`}
  >
    {names[id]}
  </a>
);

function RecentList({ ids, ...link }: ListProps) {
  return (
    <ul class="flex flex-wrap gap-2">
      {ids.map((id) => (
        <li key={id}>
          <RecentLink id={id} {...link} />
        </li>
      ))}
    </ul>
  );
}

function RecentHeading({ ui, onClear }: { ui: Props['ui']; onClear: () => void }) {
  return (
    <div class="mb-2 flex items-baseline gap-3">
      <h3 class="text-xs tracking-widest text-subtle uppercase">{ui.recentlyViewed}</h3>
      <button
        type="button"
        class="min-h-11 text-xs text-subtle hover:text-fg-soft sm:min-h-0"
        onClick={onClear}
      >
        {ui.clearRecent}
      </button>
    </div>
  );
}

export default function RecentTerms({ names, termBase, ui }: Props) {
  const { ids, clear } = useRecentIds(names);
  if (ids.length === 0) return null;
  return (
    <div class="mt-6">
      <RecentHeading ui={ui} onClear={clear} />
      <RecentList ids={ids} names={names} termBase={termBase} />
    </div>
  );
}
