import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { prerequisitesOf, type Graph } from '../lib/graph-model';
import { domainColour, nodePaint } from '../lib/graph-style';
import {
  makeTermCache,
  neighbourIds,
  neighbourhoodGraph,
  relationGroups,
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
  'rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:border-neutral-400 hover:text-neutral-100 focus-visible:outline-2 focus-visible:outline-amber-400';

/**
 * The Explorer's term panel (A80): a term's essentials beside the map — facets in both
 * languages, what to learn first, relationships (which re-focus the map, never navigate),
 * self-assessment and a quick quiz. Expand fills the page below the header, with the
 * term's neighbourhood graph; "Read more" opens the full entry page.
 */
export default function TermPanel(props: Props) {
  const { lang, id, graph, ui, text, onSelect, onClose } = props;
  const cache = termCache(props.apiBase);
  const [loaded, setLoaded] = useState<TermRecord | undefined>(() => cache.peek(id));
  /** The id whose record failed to load — never shown next to another term. */
  const [failedId, setFailedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [textLang, setTextLang] = useState<Lang>(lang);
  const [facet, setFacet] = useState<Facet>('formal');
  const [quiz, setQuiz] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const expandBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);

  const node = useMemo(() => graph.nodes.find((n) => n.id === id), [graph, id]);
  const nameOf = (x: string) => graph.nodes.find((n) => n.id === x)?.term[textLang] ?? x;

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

  // A newly opened term is announced by moving focus to its name.
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
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
  const colour = nodePaint(node).fill;
  const name = node.term[textLang];
  const aka = record?.aka[textLang] ?? [];
  const summary = record?.summary[textLang] ?? node.summary?.[textLang];
  const termHref = `${props.termBase}${id}/`;
  const mini = expanded ? neighbourhoodGraph(graph, id, lang, props.edgeLabels) : null;

  const chip = (x: string, title?: string) => (
    <button
      type="button"
      class="rounded border border-neutral-800 px-2 py-0.5 text-left text-sm text-neutral-300 hover:border-neutral-400 hover:text-neutral-100 focus-visible:outline-2 focus-visible:outline-amber-400"
      title={title}
      lang={textLang}
      onClick={() => onSelect(x)}
      onMouseEnter={() => cache.prefetch(x)}
      onFocus={() => cache.prefetch(x)}
    >
      {nameOf(x)}
    </button>
  );

  const facetText = (f: Facet) =>
    record ? (
      <p class="text-neutral-200" lang={textLang}>
        {record.body[f][textLang]}
      </p>
    ) : failed ? (
      <p class="text-sm text-red-300">{text.loadError}</p>
    ) : (
      <div class="space-y-2" aria-hidden="true">
        <div class="h-3 w-full animate-pulse rounded bg-neutral-800" />
        <div class="h-3 w-4/5 animate-pulse rounded bg-neutral-800" />
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
      onKeyDown={trap}
      class={`absolute top-0 right-0 bottom-0 z-20 flex w-full flex-col border-l border-neutral-800 bg-neutral-950/97 shadow-2xl shadow-black/60 backdrop-blur transition-[width] duration-300 ease-out motion-reduce:transition-none ${expanded ? '' : 'lg:w-[26rem]'}`}
    >
      <div class="flex shrink-0 flex-wrap items-center gap-2 border-b border-neutral-800 px-4 py-2">
        <div role="group" aria-label={text.contentLanguage} class="flex">
          {(['en', 'da'] as const).map((l) => (
            <button
              type="button"
              class={`border px-2 py-1 text-xs first:rounded-l last:rounded-r focus-visible:outline-2 focus-visible:outline-amber-400 ${textLang === l ? 'border-neutral-400 text-neutral-100' : 'border-neutral-800 text-neutral-500 hover:text-neutral-200'}`}
              aria-pressed={textLang === l}
              lang={l}
              onClick={() => setTextLang(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <div class="ml-auto flex items-center gap-2">
          <a class={btn} href={termHref} title={text.readMoreLabel}>
            {text.readMore}
          </a>
          <button
            ref={expandBtn}
            type="button"
            class={btn}
            aria-expanded={expanded}
            title={expanded ? text.panelCollapseLabel : text.panelExpandLabel}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? `⤡ ${text.panelCollapse}` : `⤢ ${text.panelExpand}`}
          </button>
          <button
            type="button"
            class={`${btn} px-2.5`}
            aria-label={text.panelClose}
            title={text.panelClose}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
      </div>

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
                <span class="tracking-widest text-neutral-400 uppercase">
                  {props.clusterLabels[node.cluster] ?? node.cluster}
                </span>
                {node.domain.map((d) => (
                  <span
                    class="rounded-full border px-2 py-0.5 text-neutral-300"
                    style={{ borderColor: domainColour(d) }}
                  >
                    {props.domainLabels[d] ?? d}
                  </span>
                ))}
              </div>
              <h2
                id="tp-title"
                ref={heading}
                tabIndex={-1}
                lang={textLang}
                class={`font-semibold outline-none ${expanded ? 'text-4xl' : 'text-2xl'}`}
              >
                {name}
              </h2>
              {aka.length > 0 && (
                <p class="mt-1 text-sm text-neutral-500" lang={textLang}>
                  {ui.aka}: {aka.join(', ')}
                </p>
              )}
              {summary && (
                <p class="mt-3 font-medium text-neutral-200" lang={textLang}>
                  {summary}
                </p>
              )}
              {record?.draft && (
                <p class="mt-3 rounded border border-amber-900 bg-amber-950/40 px-2 py-1 text-xs text-amber-300">
                  {ui.draft}
                </p>
              )}
            </header>

            <section aria-label={text.facets}>
              {expanded ? (
                <div class="grid gap-5 sm:grid-cols-2">
                  {FACETS.map((f) => (
                    <div>
                      <h3 class="mb-1 text-xs tracking-widest text-neutral-500 uppercase">
                        {ui[f]}
                      </h3>
                      {facetText(f)}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div
                    role="tablist"
                    aria-label={text.facets}
                    class="flex flex-wrap gap-1 border-b border-neutral-800"
                  >
                    {FACETS.map((f) => (
                      <button
                        type="button"
                        role="tab"
                        id={`tp-tab-${f}`}
                        aria-selected={facet === f}
                        aria-controls="tp-facet"
                        tabIndex={facet === f ? 0 : -1}
                        class={`-mb-px border-b-2 px-2 py-1.5 text-xs focus-visible:outline-2 focus-visible:outline-amber-400 ${facet === f ? 'border-neutral-200 text-neutral-100' : 'border-transparent text-neutral-500 hover:text-neutral-200'}`}
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
                <h3 class="mb-1 text-xs tracking-widest text-neutral-500 uppercase">
                  {ui.learnFirst}
                </h3>
                <p class="mb-2 text-xs text-neutral-500">{ui.learnFirstIntro}</p>
                <ol class="flex flex-wrap items-center gap-1">
                  {learnFirst.map((n, i) => (
                    <li class="flex items-center gap-1">
                      {i > 0 && (
                        <span class="text-neutral-600" aria-hidden="true">
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
              <h3 class="mb-2 text-xs tracking-widest text-neutral-500 uppercase">
                {ui.relationships}
              </h3>
              {groups.length === 0 ? (
                <p class="text-sm text-neutral-500">{text.noRelations}</p>
              ) : (
                <dl class="space-y-3">
                  {groups.map((g) => (
                    <div>
                      <dt class="text-xs text-neutral-400">{props.edgeLabels[g.type] ?? g.type}</dt>
                      <dd class="mt-1 flex flex-wrap gap-1.5">
                        {g.ids.map((x) => chip(x, why.get(`${g.type}|${x}`)?.[textLang]))}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>

            <section class="space-y-3 rounded border border-neutral-800 p-3">
              <h3 class="text-xs tracking-widest text-neutral-500 uppercase">{ui.checkYourself}</h3>
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

            <p>
              <a
                class="text-sm text-neutral-100 underline hover:text-white"
                href={termHref}
                title={text.readMoreLabel}
              >
                {text.readMore}
              </a>
            </p>
          </div>

          {mini && (
            <aside aria-label={ui.connections} class="lg:sticky lg:top-0 lg:self-start">
              <h3 class="mb-2 text-xs tracking-widest text-neutral-500 uppercase">
                {ui.connections}
              </h3>
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
