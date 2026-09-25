import { useEffect, useState } from 'preact/hooks';
import { RECENT_KEY, parseRecent } from '../lib/prefs';

interface Props {
  /** Term id → display name in this language (unknown ids are skipped). */
  names: Record<string, string>;
  termBase: string;
  ui: { recentlyViewed: string; clearRecent: string };
}

/** The entries this browser opened most recently (A62); nothing when there are none. */
export default function RecentTerms({ names, termBase, ui }: Props) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      setIds(parseRecent(localStorage.getItem(RECENT_KEY)).filter((id) => id in names));
    } catch {
      /* storage unavailable: nothing to show */
    }
  }, []);
  const clear = () => {
    setIds([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      /* nothing stored */
    }
  };
  if (ids.length === 0) return null;
  return (
    <div class="mt-6">
      <div class="mb-2 flex items-baseline gap-3">
        <h3 class="text-xs tracking-widest text-neutral-500 uppercase">{ui.recentlyViewed}</h3>
        <button
          type="button"
          class="text-xs text-neutral-600 hover:text-neutral-300"
          onClick={clear}
        >
          {ui.clearRecent}
        </button>
      </div>
      <ul class="flex flex-wrap gap-2">
        {ids.map((id) => (
          <li key={id}>
            <a
              class="inline-block rounded border border-neutral-800 px-2 py-1 text-sm text-neutral-300 hover:border-neutral-500 hover:text-neutral-100"
              href={`${termBase}${id}/`}
            >
              {names[id]}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
