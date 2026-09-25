import type { ComponentChildren } from 'preact';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { prerequisitesOf, type Graph } from '../lib/graph-model';
import { domainColour, nodePaint } from '../lib/graph-style';
import { useTheme } from '../lib/use-theme';
import {
  connectionCycle,
  makeTermCache,
  neighbourIds,
  neighbourhoodGraph,
  nextCycleState,
  positionText,
  relationGroups,
  startHistory,
  stepCycle,
  travel,
  visit,
  type Arrival,
  type CycleState,
  type PanelHistory,
  type TermRecord,
} from '../lib/term-panel';
import GraphView from './Graph';
import KnowledgeStatus from './KnowledgeStatus';
import Quiz from './Quiz';

type Lang = 'en' | 'da';
type Dict = Record<string, string>;

/** Everything the panel needs that the page renders once (explorer/index.astro). */
export type PanelConfig = {
  /** `/…/api/terms/` — per-term records live at `<apiBase><id>.json`. */
  apiBase: string;
  graphUrl: string;
  /** Page UI strings (site.ts UI[lang]). */
  ui: Dict;
  /** Panel strings (site.ts PANEL_UI[lang]). */
  text: Dict;
  /** Relationship labels, including generated inverses (terms.ts EDGE_LABELS). */
  edgeLabels: Dict;
  /** Edge type → the type seen from the other end (schema.ts EDGE_TYPES). */
  edgeInverse: Dict;
  /** Reading order of relationship groups (terms.ts RELATION_ORDER). */
  relationOrder: string[];
};

interface Props extends PanelConfig {
  lang: Lang;
  id: string;
  graph: Graph;
  termBase: string;
  clusterLabels: Dict;
  domainLabels: Dict;
  familyLabels: Dict;
  graphUi: Dict;
  /** Re-focus the map (and this panel) on another term. */
  onSelect: (id: string) => void;
  onClose: () => void;
  /** Map actions for this term (Explorer: prerequisites, neighbourhood, whole map). */
  actions?: ComponentChildren;
  /** Name of the actions group, for assistive technology. */
  actionsLabel?: string;
}

const FACETS = ['formal', 'plain', 'inPractice', 'whyItMatters'] as const;
type Facet = (typeof FACETS)[number];

const getJson = (u: string) =>
  fetch(u).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${u}`);
    return r.json() as Promise<unknown>;
  });

/** One cache per page: prefetches from the map and the panel share it. */
let shared: ReturnType<typeof makeTermCache> | undefined;
let sharedBase = '';
const termCache = (apiBase: string) => {
  if (!shared || sharedBase !== apiBase) {
    shared = makeTermCache(getJson, apiBase);
    sharedBase = apiBase;
  }
  return shared;
};

/** Warm the record for `id` (e.g. on hover), so opening it is instant. */
export const prefetchTerm = (apiBase: string, id: string) => termCache(apiBase).prefetch(id);

/** How many neighbours are warmed when a term opens. */
const PREFETCH_NEIGHBOURS = 12;

const btn =
  'rounded border border-border-strong px-2 py-1 text-xs text-fg-soft hover:border-border-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-(--focus)';

/** A small square icon button (header and Previous/Next); its name comes from aria-label. */
const iconBtn =
  'grid h-7 w-7 shrink-0 place-items-center rounded text-fg-soft hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-(--focus)';

// 16×16 stroke icons (paths on a 24-unit grid).
const ARROW_LEFT = 'M19 12H5m6-6-6 6 6 6';
const ARROW_RIGHT = 'M5 12h14m-6-6 6 6-6 6';
const CHEVRON_LEFT = 'm15 6-6 6 6 6';
const CHEVRON_RIGHT = 'm9 6 6 6-6 6';
const EXPAND = 'M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7';
const COLLAPSE = 'M20 10h-6V4M4 14h6v6M14 10l7-7M10 14l-7 7';
const CLOSE = 'M6 6l12 12M18 6 6 18';
const icon = (d: string) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

/**
 * The Explorer's term panel (A80): a term's essentials beside the map, in the site's
 * language: facets, what to learn first, relationships (which re-focus the map, never navigate),
 * self-assessment and a quick quiz. Expand fills the page below the header, with the
 * term's neighbourhood graph; "Read more", at the end of the panel, opens the full entry page.
 */
export default function TermPanel(props: Props) {
  const { lang, id, graph, ui, text, onSelect, onClose } = props;
  const theme = useTheme();
  const cache = termCache(props.apiBase);
  const [loaded, setLoaded] = useState<TermRecord | undefined>(() => cache.peek(id));
  /** The id whose record failed to load — never shown next to another term. */
  const [failedId, setFailedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [facet, setFacet] = useState<Facet>('formal');
  const [quiz, setQuiz] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const expandBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);

  const node = useMemo(() => graph.nodes.find((n) => n.id === id), [graph, id]);
  const nameOf = (x: string) => graph.nodes.find((n) => n.id === x)?.term[lang] ?? x;

  // Previous/Next walk the anchor term's connections; Back/Forward walk the terms viewed
  // in this panel. `pending` marks a move the panel itself asked for, so the next `id`
  // can tell a step or history move from a pick made anywhere else (node, chip, search).
  const [walk, setWalk] = useState<CycleState>(() => ({ anchor: id, index: null }));
  const [trail, setTrail] = useState<PanelHistory>(() => startHistory(id));
  const [announce, setAnnounce] = useState('');
  const pending = useRef<{ id: string; arrival: Arrival } | null>(null);
  const focusName = useRef(true);
  const shownId = useRef(id);
  const cycleOf = (anchor: string) =>
    connectionCycle(relationGroups(graph, anchor, props.edgeInverse, props.relationOrder), (x) =>
      graph.nodes.some((n) => n.id === x),
    );
  const cycle = cycleOf(walk.anchor);
  const atAnchor = walk.anchor === id || walk.index === null;
  const anchorName = nameOf(walk.anchor);
  const positionOf = (i: number | null) =>
    i === null || !cycle[i]
      ? ''
      : positionText(
          text.cyclePosition,
          i,
          cycle.length,
          props.edgeLabels[cycle[i].type] ?? cycle[i].type,
        );

  // Before paint, so the position never shows a stale walk for a frame.
  useLayoutEffect(() => {
    if (shownId.current === id) return;
    shownId.current = id;
    const arrival: Arrival =
      pending.current?.id === id ? pending.current.arrival : { via: 'other' };
    pending.current = null;
    const next = nextCycleState(walk, id, arrival, cycle);
    setWalk(next);
    if (arrival.via !== 'history') setTrail((h) => visit(h, id));
    // A pick from elsewhere (or "return to" the anchor, whose button then disappears)
    // moves focus to the name, which announces it; Previous/Next/Back/Forward keep focus
    // on their button and announce through the live region instead.
    focusName.current =
      arrival.via === 'other' || (arrival.via === 'step' && arrival.index === null);
    const where = next.anchor === id ? '' : positionOf(next.index);
    setAnnounce(focusName.current ? '' : where ? `${nameOf(id)} - ${where}` : nameOf(id));
  }, [id]);

  /** Show `target` via a panel control: Explorer (or Timeline) selects it on the map. */
  const go = (target: string, arrival: Arrival) => {
    pending.current = { id: target, arrival };
    onSelect(target);
  };

  const step = (dir: 1 | -1) => {
    const i = stepCycle(cycle.length, atAnchor ? null : walk.index, dir);
    if (i === null) return;
    const target = cycle[i].id;
    if (target !== id) return go(target, { via: 'step', index: i });
    // The same term listed under another relationship: only the position moves.
    setWalk({ anchor: walk.anchor, index: i });
    setAnnounce(`${nameOf(id)} - ${positionOf(i)}`);
  };

  const move = (dir: 1 | -1) => {
    const r = travel(trail, dir);
    if (!r) return;
    setTrail(r.history);
    go(r.id, { via: 'history' });
  };

  // Load the record (instant when cached) and warm the neighbours' records.
  useEffect(() => {
    let live = true;
    setQuiz(false);
    cache.load(id).then(
      (r) => live && setLoaded(r),
      () => live && setFailedId(id),
    );
    const warm = window.setTimeout(
      () => neighbourIds(graph, id).slice(0, PREFETCH_NEIGHBOURS).forEach(cache.prefetch),
      300,
    );
    return () => {
      live = false;
      window.clearTimeout(warm);
    };
  }, [id]);

  // Remember what had focus before the panel opened, and give it back on close.
  useEffect(() => {
    const active = document.activeElement;
    opener.current = active && !root.current?.contains(active) ? active : null;
    return () => {
      const back = opener.current as HTMLElement | null;
      if (back && back !== document.body && back.isConnected) back.focus();
    };
  }, []);

  // A newly opened term is announced by moving focus to its name (unless the panel's own
  // Previous/Next/Back/Forward moved it — see above).
  useEffect(() => {
    if (focusName.current) heading.current?.focus({ preventScroll: true });
    focusName.current = true;
  }, [id]);

  // Esc: expanded → docked → closed. Typing in a field elsewhere is left alone.
  // Listened for in the capture phase, so it runs before the tour's document-level
  // handler: while a tour card is open, Esc belongs to the tour alone. (Expectation for
  // Tour.tsx: it should call e.preventDefault() when it consumes Escape, so other
  // handlers that check `defaultPrevented` stand down.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('[data-tour-overlay]')) return;
      // An open map popover (the Explorer's control bar) takes this Escape.
      if (document.querySelector('[data-map-popover]')) return;
      const t = e.target as HTMLElement | null;
      const inPanel = !!t && !!root.current?.contains(t);
      if (!inPanel && t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      e.preventDefault();
      if (expanded) {
        setExpanded(false);
        expandBtn.current?.focus();
      } else onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [expanded, onClose]);

  // Expanded, the panel is a modal dialog: Tab cycles inside it.
  const trap = (e: KeyboardEvent) => {
    if (!expanded || e.key !== 'Tab' || !root.current) return;
    const items = [
      ...root.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // ←/→ step through the connections, Alt+←/→ go back/forward — while focus is in the
  // panel, outside fields; widgets that use the arrows themselves (the facet tabs) handle
  // them first and call preventDefault.
  const onPanelKey = (e: KeyboardEvent) => {
    trap(e);
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    const t = e.target as HTMLElement | null;
    if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    e.preventDefault();
    if (e.altKey) move(dir);
    else step(dir);
  };

  if (!node) return null;

  // Derived at render time, so a previous term's facets, aliases or error never paint
  // beside the new term while its record loads.
  const record = loaded?.id === id ? loaded : cache.peek(id);
  const failed = failedId === id && !record;

  const groups = relationGroups(graph, id, props.edgeInverse, props.relationOrder);
  const learnFirst = prerequisitesOf(graph, id);
  const why = new Map(
    (record?.edges ?? []).filter((e) => e.why).map((e) => [`${e.type}|${e.to}`, e.why!]),
  );
  const colour = nodePaint(node, theme).fill;
  const name = node.term[lang];
  const aka = record?.aka[lang] ?? [];
  const summary = record?.summary[lang] ?? node.summary?.[lang];
  const termHref = `${props.termBase}${id}/`;
  const mini = expanded ? neighbourhoodGraph(graph, id, lang, props.edgeLabels) : null;

  const chip = (x: string, title?: string) => (
    <button
      type="button"
      class="rounded border border-border px-2 py-0.5 text-left text-sm text-fg-soft hover:border-border-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-(--focus)"
      title={title}

      onClick={() => onSelect(x)}
      onMouseEnter={() => cache.prefetch(x)}
      onFocus={() => cache.prefetch(x)}
    >
      {nameOf(x)}
    </button>
  );

  const facetText = (f: Facet) =>
    record ? (
      <p class="text-fg-soft">{record.body[f][lang]}</p>
    ) : failed ? (
      <p class="text-sm text-red-700 dark:text-red-300">{text.loadError}</p>
    ) : (
      <div class="space-y-2" aria-hidden="true">
        <div class="h-3 w-full animate-pulse rounded bg-surface-2" />
        <div class="h-3 w-4/5 animate-pulse rounded bg-surface-2" />
      </div>
    );

  const onTabKey = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    const edge = e.key === 'Home' ? 0 : e.key === 'End' ? FACETS.length - 1 : -1;
    if (!step && edge < 0) return;
    e.preventDefault();
    const next = edge >= 0 ? edge : (FACETS.indexOf(facet) + step + FACETS.length) % FACETS.length;
    setFacet(FACETS[next]);
    root.current?.querySelector<HTMLElement>(`#tp-tab-${FACETS[next]}`)?.focus();
  };

  return (
    <div
      ref={root}
      role={expanded ? 'dialog' : 'complementary'}
      aria-modal={expanded ? true : undefined}
      aria-labelledby="tp-title"
      data-term-panel={id}
      data-expanded={expanded ? '' : undefined}
      onKeyDown={onPanelKey}
      class={`absolute top-0 right-0 bottom-0 z-20 flex w-full flex-col border-l border-border bg-bg/97 shadow-2xl shadow-black/20 dark:shadow-black/60 backdrop-blur transition-[width] duration-300 ease-out motion-reduce:transition-none ${expanded ? '' : 'lg:w-[26rem]'}`}
    >
      <div class="flex shrink-0 items-center gap-1 border-b border-border px-3 py-1.5">
        <button
          type="button"
          class={`${iconBtn} aria-disabled:opacity-40`}
          aria-label={text.historyBack}
          title={text.historyBack}
          aria-disabled={trail.pos <= 0}
          data-panel-back
          onClick={() => move(-1)}
        >
          {icon(ARROW_LEFT)}
        </button>
        <button
          type="button"
          class={`${iconBtn} aria-disabled:opacity-40`}
          aria-label={text.historyForward}
          title={text.historyForward}
          aria-disabled={trail.pos >= trail.entries.length - 1}
          data-panel-forward
          onClick={() => move(1)}
        >
          {icon(ARROW_RIGHT)}
        </button>
        <button
          ref={expandBtn}
          type="button"
          class={`${iconBtn} ml-auto`}
          aria-expanded={expanded}
          aria-label={expanded ? text.panelCollapseLabel : text.panelExpandLabel}
          title={expanded ? text.panelCollapseLabel : text.panelExpandLabel}
          data-panel-expand
          onClick={() => setExpanded(!expanded)}
        >
          {icon(expanded ? COLLAPSE : EXPAND)}
        </button>
        <button
          type="button"
          class={iconBtn}
          aria-label={text.panelClose}
          title={text.panelClose}
          data-panel-close
          onClick={onClose}
        >
          {icon(CLOSE)}
        </button>
      </div>

      {(cycle.length > 0 || props.actions) && (
        <div class="shrink-0 border-b border-border px-3 py-1.5 text-xs">
          <div
            class={
              expanded
                ? 'mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-1 sm:px-5'
                : 'space-y-1'
            }
          >
            {cycle.length > 0 && (
              <div
                role="group"
                aria-label={text.connectionsOf.replace('{name}', anchorName)}
                data-panel-cycle={walk.anchor}
                class={`flex items-center gap-1 ${expanded ? 'w-full max-w-md' : ''}`}
              >
                <button
                  type="button"
                  class={iconBtn}
                  title={text.prevConnectionLabel.replace('{name}', anchorName)}
                  aria-label={text.prevConnectionLabel.replace('{name}', anchorName)}
                  data-panel-prev
                  onClick={() => step(-1)}
                >
                  {icon(CHEVRON_LEFT)}
                </button>
                <p class="min-w-0 flex-1 truncate text-center text-muted" data-panel-position>
                  {atAnchor ? (
                    cycle.length === 1 ? (
                      text.connectionCountOne
                    ) : (
                      text.connectionCount.replace('{n}', String(cycle.length))
                    )
                  ) : (
                    <>
                      {positionOf(walk.index)}
                      {' · '}
                      <button
                        type="button"
                        class="text-fg-soft underline hover:text-fg focus-visible:outline-2 focus-visible:outline-(--focus)"
                        title={text.returnTo.replace('{name}', anchorName)}
                        onClick={() => go(walk.anchor, { via: 'step', index: null })}
                      >
                        ↩ {anchorName}
                      </button>
                    </>
                  )}
                </p>
                <button
                  type="button"
                  class={iconBtn}
                  title={text.nextConnectionLabel.replace('{name}', anchorName)}
                  aria-label={text.nextConnectionLabel.replace('{name}', anchorName)}
                  data-panel-next
                  onClick={() => step(1)}
                >
                  {icon(CHEVRON_RIGHT)}
                </button>
              </div>
            )}
            {props.actions && (
              <div
                role="group"
                aria-label={props.actionsLabel}
                data-panel-actions
                class="flex flex-wrap items-center gap-x-0.5 gap-y-1 [&>button]:border-transparent [&>button]:px-1.5 [&>button]:py-0.5 [&>button]:text-muted [&>button:hover]:bg-surface-2 [&>button:hover]:text-fg [&>button[aria-pressed=true]]:bg-surface-2 [&>button[aria-pressed=true]]:text-fg"
              >
                {props.actionsLabel && (
                  <span class="mr-1 text-subtle" aria-hidden="true">
                    {props.actionsLabel}:
                  </span>
                )}
                {props.actions}
              </div>
            )}
          </div>
        </div>
      )}
      <p class="sr-only" aria-live="polite" data-panel-announce>
        {announce}
      </p>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <div
          class={
            expanded
              ? 'mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_22rem]'
              : 'px-4 py-4'
          }
        >
          <div class="space-y-6">
            <header>
              <div class="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
                <span
                  class="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: colour }}
                  aria-hidden="true"
                />
                <span class="tracking-widest text-muted uppercase">
                  {props.clusterLabels[node.cluster] ?? node.cluster}
                </span>
                {node.domain.map((d) => (
                  <span
                    class="rounded-full border px-2 py-0.5 text-fg-soft"
                    style={{ borderColor: domainColour(d, theme) }}
                  >
                    {props.domainLabels[d] ?? d}
                  </span>
                ))}
              </div>
              <h2
                id="tp-title"
                ref={heading}
                tabIndex={-1}

                class={`font-semibold outline-none ${expanded ? 'text-4xl' : 'text-2xl'}`}
              >
                {name}
              </h2>
              {aka.length > 0 && (
                <p class="mt-1 text-sm text-subtle">
                  {ui.aka}: {aka.join(', ')}
                </p>
              )}
              {summary && <p class="mt-3 font-medium text-fg-soft">{summary}</p>}
              {record?.draft && (
                <p class="mt-3 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                  {ui.draft}
                </p>
              )}
            </header>

            <section aria-label={text.facets}>
              {expanded ? (
                <div class="grid gap-5 sm:grid-cols-2">
                  {FACETS.map((f) => (
                    <div>
                      <h3 class="mb-1 text-xs tracking-widest text-subtle uppercase">{ui[f]}</h3>
                      {facetText(f)}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div
                    role="tablist"
                    aria-label={text.facets}
                    class="flex flex-wrap gap-1 border-b border-border"
                  >
                    {FACETS.map((f) => (
                      <button
                        type="button"
                        role="tab"
                        id={`tp-tab-${f}`}
                        aria-selected={facet === f}
                        aria-controls="tp-facet"
                        tabIndex={facet === f ? 0 : -1}
                        class={`-mb-px border-b-2 px-2 py-1.5 text-xs focus-visible:outline-2 focus-visible:outline-(--focus) ${facet === f ? 'border-border-hover text-fg' : 'border-transparent text-subtle hover:text-fg-soft'}`}
                        onClick={() => setFacet(f)}
                        onKeyDown={onTabKey}
                      >
                        {ui[f]}
                      </button>
                    ))}
                  </div>
                  <div
                    id="tp-facet"
                    role="tabpanel"
                    aria-labelledby={`tp-tab-${facet}`}
                    class="pt-3"
                  >
                    {facetText(facet)}
                  </div>
                </>
              )}
            </section>

            {learnFirst.length > 0 && (
              <section>
                <h3 class="mb-1 text-xs tracking-widest text-subtle uppercase">{ui.learnFirst}</h3>
                <p class="mb-2 text-xs text-subtle">{ui.learnFirstIntro}</p>
                <ol class="flex flex-wrap items-center gap-1">
                  {learnFirst.map((n, i) => (
                    <li class="flex items-center gap-1">
                      {i > 0 && (
                        <span class="text-subtle" aria-hidden="true">
                          →
                        </span>
                      )}
                      {chip(n.id)}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section>
              <h3 class="mb-2 text-xs tracking-widest text-subtle uppercase">{ui.relationships}</h3>
              {groups.length === 0 ? (
                <p class="text-sm text-subtle">{text.noRelations}</p>
              ) : (
                <dl class="space-y-3">
                  {groups.map((g) => (
                    <div>
                      <dt class="text-xs text-muted">{props.edgeLabels[g.type] ?? g.type}</dt>
                      <dd class="mt-1 flex flex-wrap gap-1.5">
                        {g.ids.map((x) => chip(x, why.get(`${g.type}|${x}`)?.[lang]))}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>

            <section class="space-y-3 rounded border border-border p-3">
              <h3 class="text-xs tracking-widest text-subtle uppercase">{ui.checkYourself}</h3>
              <KnowledgeStatus key={id} termId={id} ui={ui} />
              {quiz ? (
                <Quiz
                  key={id}
                  lang={lang}
                  graphUrl={props.graphUrl}
                  termBase={props.termBase}
                  ui={ui}
                  termId={id}
                  count={3}
                />
              ) : (
                <button type="button" class={btn} onClick={() => setQuiz(true)}>
                  {text.quickQuiz}
                </button>
              )}
            </section>

            <a
              class="flex w-full items-center justify-center gap-2 rounded border border-border-strong px-3 py-2 text-sm font-medium text-fg hover:border-border-hover hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-(--focus)"
              href={termHref}
              title={text.readMoreLabel}
              data-panel-read-more
            >
              {text.readMore}
            </a>
          </div>

          {mini && (
            <aside aria-label={ui.connections} class="lg:sticky lg:top-0 lg:self-start">
              <h3 class="mb-2 text-xs tracking-widest text-subtle uppercase">{ui.connections}</h3>
              <GraphView
                key={id}
                nodes={mini.nodes}
                edges={mini.edges}
                termBase={props.termBase}
                familyLabels={props.familyLabels}
                domainLabels={props.domainLabels}
                clusterLabels={props.clusterLabels}
                text={props.graphUi}
                onSelect={onSelect}
              />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
