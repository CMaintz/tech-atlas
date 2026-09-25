import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import {
  TOUR_DONE_KEY,
  TOUR_KEY,
  TOUR_PARAM,
  TOUR_SNOOZE_KEY,
  fillCount,
  moveTo,
  pageOf,
  parseTourState,
  resolveTour,
  stepFromQuery,
  type TourStep,
  type TourView,
} from '../lib/tour';
import { isTypingTarget } from '../lib/prefs';

interface Props {
  steps: TourStep[];
  /** Language root, e.g. /tech-atlas/en/ */
  langBase: string;
  /** False on pages where a first-time visitor should not be greeted (the 404 page). */
  autoStart?: boolean;
  ui: {
    tourWelcomeStart: string;
    tourNotNow: string;
    tourDontShow: string;
    tourNext: string;
    tourBack: string;
    tourFinish: string;
    tourClose: string;
    tourStepOf: string;
    tourContinue: string;
    tourEnd: string;
  };
}

// Storage can be missing or throw (private mode, blocked site data). The tour then
// carries its step across page loads in the URL (?tour=N) instead, and never
// auto-starts — it could not remember being dismissed.
const read = (store: () => Storage, key: string) => {
  try {
    return store().getItem(key);
  } catch {
    return null;
  }
};
const write = (store: () => Storage, key: string, value: string | null) => {
  try {
    if (value === null) store().removeItem(key);
    else store().setItem(key, value);
  } catch {
    /* not persisted */
  }
};
const local = () => localStorage;
const session = () => sessionStorage;
const storageWorks = () => {
  try {
    localStorage.setItem('atlas.probe', '1');
    localStorage.removeItem('atlas.probe');
    return true;
  } catch {
    return false;
  }
};

type Rect = { top: number; left: number; width: number; height: number };
const PAD = 6;
/** How long to wait for an anchor rendered by a client-only island (the Explorer). */
const ANCHOR_WAIT_MS = 3000;

const findAnchor = (anchors: string[]) => {
  for (const sel of anchors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el && el.getClientRects().length > 0) return el;
  }
  return null;
};

/**
 * The guided tour (A61): a non-modal, step-by-step card with a spotlight on the part
 * of the page it describes. Its position is kept in localStorage, so it follows the
 * reader from page to page; a click on any `[data-tour-start]` element restarts it.
 */
export default function Tour({ steps, langBase, autoStart = true, ui }: Props) {
  const [view, setView] = useState<TourView>({ kind: 'off' });
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [dontShow, setDontShow] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const storageOk = useRef(true);
  /** The "Take the tour" control that opened the tour — focus returns there. */
  const opener = useRef<HTMLElement | null>(null);
  const page = typeof location === 'undefined' ? null : pageOf(location.pathname, langBase);

  const persist = (step: number | null) =>
    write(local, TOUR_KEY, step === null ? null : JSON.stringify({ active: true, step }));

  const finish = (markDone: boolean) => {
    persist(null);
    if (markDone) write(local, TOUR_DONE_KEY, '1');
    else write(session, TOUR_SNOOZE_KEY, '1');
    setView({ kind: 'off' });
    const back = opener.current?.isConnected ? opener.current : document.getElementById('main');
    back?.focus({ preventScroll: true });
    opener.current = null;
  };

  const go = (to: number) => {
    const move = moveTo(steps, to, page);
    if (move.kind === 'finish') return finish(true);
    persist(move.step);
    if (move.kind === 'go') {
      const carry = storageOk.current ? '' : `?${TOUR_PARAM}=${move.step}`;
      location.href = langBase + move.page + carry;
    } else setView({ kind: 'show', step: move.step });
  };

  // Decide what to show on load; listen for "Take the tour".
  useEffect(() => {
    storageOk.current = storageWorks();
    // A step carried in the URL (storage unavailable) wins; then drop it from the URL.
    const fromUrl = stepFromQuery(location.search, steps.length);
    if (fromUrl !== null) {
      const clean = new URL(location.href);
      clean.searchParams.delete(TOUR_PARAM);
      history.replaceState(history.state, '', clean);
    }
    setView(
      resolveTour({
        steps,
        state:
          fromUrl !== null
            ? { active: true, step: fromUrl }
            : parseTourState(read(local, TOUR_KEY), steps.length),
        done: read(local, TOUR_DONE_KEY) === '1',
        snoozed: read(session, TOUR_SNOOZE_KEY) === '1',
        page,
        autoStart: autoStart && storageOk.current,
      }),
    );
    const start = (e: Event) => {
      const t = (e.target as Element | null)?.closest?.<HTMLElement>('[data-tour-start]');
      if (!t) return;
      e.preventDefault();
      opener.current = t;
      write(local, TOUR_DONE_KEY, null);
      write(session, TOUR_SNOOZE_KEY, null);
      go(0);
    };
    document.addEventListener('click', start);
    return () => document.removeEventListener('click', start);
  }, []);

  const current = view.kind === 'show' ? steps[view.step] : null;

  // Find the step's anchor — waiting briefly for islands that render late.
  useEffect(() => {
    setAnchor(null);
    setRect(null);
    if (!current || current.anchors.length === 0) return;
    const found = findAnchor(current.anchors);
    if (found) return setAnchor(found);
    const obs = new MutationObserver(() => {
      const el = findAnchor(current.anchors);
      if (el) {
        obs.disconnect();
        setAnchor(el);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    const timer = setTimeout(() => obs.disconnect(), ANCHOR_WAIT_MS);
    return () => {
      obs.disconnect();
      clearTimeout(timer);
    };
  }, [current]);

  // Bring the anchor into view and follow it while the page scrolls or resizes.
  useLayoutEffect(() => {
    if (!anchor) return;
    anchor.scrollIntoView({ block: 'nearest' });
    const r0 = anchor.getBoundingClientRect();
    // Keep it in the upper part of the screen, clear of the card (bottom sheet on phones).
    if (r0.top < 72 || r0.top > window.innerHeight * 0.4) {
      window.scrollBy({ top: r0.top - 88 });
    }
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = anchor.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    const ro = new ResizeObserver(measure);
    ro.observe(anchor);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      ro.disconnect();
    };
  }, [anchor, current]);

  // Move focus to the card on every step, so keyboard and screen-reader users follow.
  useEffect(() => {
    if (current) card.current?.focus();
  }, [current]);

  useEffect(() => {
    if (view.kind !== 'show') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      // Let a field (the search box) and an open mobile menu have their Escape first.
      const target = e.target as HTMLElement | null;
      if (isTypingTarget(target) && !card.current?.contains(target)) return;
      if (document.querySelector('[data-site-header][data-open]')) return;
      finish(view.step === 0 ? dontShow : false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [view, dontShow]);

  const total = steps.length - 1; // the welcome card is not counted as a step

  if (view.kind === 'resume') {
    return (
      <div class="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm shadow-lg print:hidden">
        <button
          type="button"
          class="text-amber-300 hover:underline"
          onClick={() => go(view.step)}
          data-tour-resume
        >
          {fillCount(ui.tourContinue, view.step, total)} →
        </button>
        <button
          type="button"
          class="text-neutral-500 hover:text-neutral-200"
          onClick={() => finish(false)}
        >
          {ui.tourEnd}
        </button>
      </div>
    );
  }
  if (view.kind !== 'show' || !current) return null;

  const welcome = view.step === 0;
  const last = view.step === steps.length - 1;
  const titleId = 'tour-title';
  const bodyId = 'tour-body';
  const btn = 'rounded border px-3 py-1.5 text-sm';

  return (
    <div class="print:hidden" data-tour-overlay>
      {rect ? (
        <div
          aria-hidden="true"
          class="pointer-events-none fixed z-40 rounded border-2 border-amber-400 transition-all duration-200"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
          }}
        />
      ) : (
        <div aria-hidden="true" class="pointer-events-none fixed inset-0 z-40 bg-black/55" />
      )}
      <div
        ref={card}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        class={`fixed z-50 max-h-[60vh] overflow-y-auto rounded border border-neutral-700 bg-neutral-900 p-4 text-neutral-100 shadow-2xl focus:outline-none ${placement(rect)}`}
        style={cardStyle(rect)}
      >
        <div class="mb-1 flex items-start justify-between gap-4">
          <h2 id={titleId} class="text-base font-semibold">
            {current.title}
          </h2>
          <button
            type="button"
            aria-label={ui.tourClose}
            title={ui.tourClose}
            class="-mt-1 -mr-1 px-1 text-lg leading-none text-neutral-500 hover:text-neutral-100"
            onClick={() => finish(welcome ? dontShow : false)}
          >
            ×
          </button>
        </div>
        <p id={bodyId} class="text-sm text-neutral-300">
          {current.body}
        </p>
        {welcome ? (
          <div class="mt-4 space-y-3">
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class={`${btn} border-amber-400 bg-amber-400 font-medium text-neutral-950 hover:bg-amber-300`}
                onClick={() => go(1)}
              >
                {ui.tourWelcomeStart}
              </button>
              <button
                type="button"
                class={`${btn} border-neutral-700 text-neutral-300 hover:border-neutral-500`}
                onClick={() => finish(dontShow)}
              >
                {ui.tourNotNow}
              </button>
            </div>
            <label class="flex items-center gap-2 text-xs text-neutral-400">
              <input
                type="checkbox"
                checked={dontShow}
                onChange={(e) => setDontShow((e.target as HTMLInputElement).checked)}
              />
              {ui.tourDontShow}
            </label>
          </div>
        ) : (
          <div class="mt-4 flex items-center justify-between gap-3">
            <span class="text-xs text-neutral-500" aria-live="polite">
              {fillCount(ui.tourStepOf, view.step, total)}
            </span>
            <div class="flex gap-2">
              {view.step > 1 && (
                <button
                  type="button"
                  class={`${btn} border-neutral-700 text-neutral-300 hover:border-neutral-500`}
                  onClick={() => go(view.step - 1)}
                >
                  {ui.tourBack}
                </button>
              )}
              <button
                type="button"
                class={`${btn} border-amber-400 bg-amber-400 font-medium text-neutral-950 hover:bg-amber-300`}
                onClick={() => go(view.step + 1)}
                data-tour-next
              >
                {last ? ui.tourFinish : ui.tourNext}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Phones: a bottom sheet. Wider screens: beside the anchor, or centred without one. */
function placement(rect: Rect | null) {
  const base = 'inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-auto sm:w-[22rem]';
  return rect ? base : `${base} sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2`;
}

function cardStyle(rect: Rect | null): Record<string, string | number> | undefined {
  if (!rect || typeof window === 'undefined' || window.innerWidth < 640) return undefined;
  const W = 352; // 22rem
  const gap = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.min(Math.max(12, rect.left), vw - W - 12);
  const below = rect.top + rect.height + PAD + gap;
  // Below the anchor if there is room, else above it, else pinned to the bottom.
  if (below + 200 < vh) return { top: below, left };
  if (rect.top - PAD - gap > 220) return { bottom: vh - rect.top + PAD + gap, left };
  return { bottom: 12, left: vw - W - 12 };
}
