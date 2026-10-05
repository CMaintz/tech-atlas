/** The canvas lab's floating toolbar: one slim row over the top of the map. */
import { useMemo } from 'preact/hooks';
import type { Graph } from '../../lib/graph-model';
import { domainColour } from '../../lib/graph-style';
import { searchTerms } from '../../lib/canvas-explorer';
import { bar, pill, seg } from './styles';
import type { Dict, Lang } from './text';
import { toggled } from './use-lab-state';
import type { Mode } from './state';
import type { CanvasLab } from './use-canvas-lab';

type P = { lab: CanvasLab };

/** One row, wrapping on narrow screens; it stops short of the docked term panel. */
export default function Toolbar({ lab }: P) {
  const { t } = lab.chrome;
  return (
    <div
      class={`absolute top-3 right-14 left-3 z-10 ${lab.sel ? 'lg:right-[calc(26rem+3.5rem)]' : ''} flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 text-sm ${bar}`}
      data-lab-toolbar
    >
      <span class="text-xs font-semibold tracking-widest text-subtle uppercase">{t.title}</span>
      <ModeControls lab={lab} />
      <EdgeSwitch lab={lab} />
      <DomainPills lab={lab} />
      <FamilyMenu lab={lab} />
      <SearchBox lab={lab} />
      <ToolbarEnd lab={lab} />
    </div>
  );
}

/** Reset view, and a link to the real Explorer. */
function ToolbarEnd({ lab }: P) {
  const { t, site } = lab.chrome;
  return (
    <>
      <button class={pill(false)} onClick={lab.actions.resetView}>
        {t.fit}
      </button>
      <a class="text-xs text-accent hover:underline" href={site.explorerUrl}>
        {t.compare}
      </a>
    </>
  );
}

/** A segmented switch: one pressed button per option. */
function Switch<T>(p: { value: T; options: [T, string][]; on: (v: T) => void }) {
  return (
    <div class="flex overflow-hidden rounded-full border border-border-strong">
      {p.options.map(([v, label]) => (
        <button class={seg(p.value === v)} aria-pressed={p.value === v} onClick={() => p.on(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** Flat / Depth, and auto-rotate (Depth only). */
function ModeControls({ lab }: P) {
  const { t } = lab.chrome;
  const { mode, setMode } = lab.ui;
  const modes: [Mode, string][] = [
    ['flat', t.flat],
    ['depth', t.depth],
  ];
  return (
    <>
      <Switch value={mode} options={modes} on={setMode} />
      {mode === 'depth' && <SpinToggle lab={lab} />}
    </>
  );
}

function SpinToggle({ lab }: P) {
  const { spin, setSpin } = lab.ui;
  return (
    <label class="flex items-center gap-1.5 text-xs text-fg-soft">
      <input type="checkbox" checked={spin} onChange={() => setSpin(!spin)} />
      {lab.chrome.t.spin}
    </label>
  );
}

/** Edges: the backbone (default) or all of them. */
function EdgeSwitch({ lab }: P) {
  const { t } = lab.chrome;
  const edges: [boolean, string][] = [
    [false, t.backbone],
    [true, t.all],
  ];
  return (
    <div class="flex items-center gap-1.5">
      <span class="text-xs text-subtle">{t.edges}</span>
      <Switch value={lab.filters.showAll} options={edges} on={lab.filters.setShowAll} />
    </div>
  );
}

/** A toggle pill per domain, with its colour as a filled (on) or ringed (off) dot. */
function DomainPills({ lab }: P) {
  const { allDomains, theme, site } = lab.chrome;
  const { domains, setDomains } = lab.filters;
  return (
    <div class="flex flex-wrap items-center gap-1.5" role="group" aria-label={site.ui.domains}>
      {allDomains.map((d) => (
        <button
          class={pill(domains.has(d))}
          aria-pressed={domains.has(d)}
          onClick={() => setDomains(toggled(domains, d))}
        >
          <span
            class="inline-block h-2 w-2 rounded-full"
            style={{
              background: domains.has(d) ? domainColour(d, theme) : 'transparent',
              boxShadow: `inset 0 0 0 1px ${domainColour(d, theme)}`,
            }}
          />
          {site.domainLabels[d] ?? d}
        </button>
      ))}
    </div>
  );
}

/** Relationship types: a menu of family checkboxes (the pill is on while all are). */
function FamilyMenu({ lab }: P) {
  const { familyKeys, famColours, site } = lab.chrome;
  const { families, setFamilies } = lab.filters;
  return (
    <details class="relative">
      <summary class={`${pill(families.size === familyKeys.length)} cursor-pointer list-none`}>
        {site.ui.relationshipTypes} ▾
      </summary>
      <div class={`absolute top-full left-0 mt-2 w-64 space-y-1 p-3 ${bar}`}>
        {familyKeys.map((f) => (
          <label class="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={families.has(f)}
              onChange={() => setFamilies(toggled(families, f))}
            />
            <span class="inline-block h-0.5 w-4" style={{ background: famColours[f] }} />
            {site.familyLabels[f] ?? f}
          </label>
        ))}
      </div>
    </details>
  );
}

/** Find a term: Enter takes the best match, Escape clears; matches list below. */
function SearchBox({ lab }: P) {
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

/** The query's matches; picking one focuses it and clears the box. */
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
    <ul class={`absolute top-full left-0 mt-2 w-60 space-y-0.5 p-2 text-xs ${bar}`}>
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
