import { useMemo } from 'preact/hooks';
import type { Graph } from '../../lib/graph-model';
import { searchTerms } from '../../lib/canvas-explorer';
import { frostedPanel } from './styles';
import type { Dict, Lang } from './text';
import type { CanvasLab } from './use-canvas-lab';

export default function SearchBox({ lab }: { lab: CanvasLab }) {
  const { t, lang } = lab.chrome;
  const { query, setQuery, matches, pick, onKeyDown } = useSearch(lab);
  return (
    <div class="relative">
      <input
        type="search"
        placeholder={t.search}
        aria-label={t.search}
        value={query}
        onInput={(ev) => setQuery((ev.target as HTMLInputElement).value)}
        onKeyDown={onKeyDown}
        class="w-44 rounded-full border border-border-strong bg-surface px-3 py-0.5 text-xs"
      />
      {query.trim() && <Matches t={t} lang={lang} matches={matches} pick={pick} />}
    </div>
  );
}

function useSearch(lab: CanvasLab) {
  const { graph } = lab;
  const { lang } = lab.chrome;
  const { query, setQuery } = lab.ui;
  const matches = useMemo(
    () => (graph ? searchTerms(graph.nodes, query, lang) : []),
    [graph, query, lang],
  );
  const pick = (id: string) => {
    lab.actions.focusTerm(id);
    setQuery('');
  };
  const onKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === 'Enter' && matches[0]) pick(matches[0].id);
    if (ev.key === 'Escape') setQuery('');
  };
  return { query, setQuery, matches, pick, onKeyDown };
}

function Matches(p: { t: Dict; lang: Lang; matches: Graph['nodes']; pick: (id: string) => void }) {
  return (
    <ul class={`absolute top-full left-0 mt-2 w-60 space-y-0.5 p-2 text-xs ${frostedPanel}`}>
      {p.matches.length === 0 && <li class="px-1 text-subtle">{p.t.noMatch}</li>}
      {p.matches.map((m) => (
        <li>
          <button
            class="w-full rounded px-1 py-0.5 text-left text-fg-soft hover:bg-surface-2 hover:text-fg"
            onClick={() => p.pick(m.id)}
          >
            {m.term[p.lang]}
          </button>
        </li>
      ))}
    </ul>
  );
}
