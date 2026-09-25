import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import {
  TOUR_DONE_KEY,
  TOUR_KEY,
  TOUR_PARAM,
  TOUR_SNOOZE_KEY,
  bridgeSelectors,
  fillCount,
  moveTo,
  nearViewport,
  pageOf,
  parseTourState,
  placeCard,
  resolveTour,
  scrollDelta,
  stepFromQuery,
  type Placement,
  type Rect,
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
    tourBridgeLink: string;
    tourBridgeMenu: string;
  };
}

/** A running tour, plus the "this link takes you there" card shown before a page change. */
type View = TourView | { kind: 'bridge'; from: number; to: number };
/** What the bridge card points at: a link to the next page, or the phone menu holding it. */
type Via = 'link' | 'menu';

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

/** How long to wait for an anchor rendered by a client-only island (the Explorer). */
const ANCHOR_WAIT_MS = 3000;
/** Longest a smooth scroll may take before the spotlight moves anyway. */
const SCROLL_WAIT_MS = 1200;
/** Keep in step with the CSS (`--tour-move`, `--tour-fade` in global.css). */
const MOVE_MS = 420;
const FADE_MS = 260;

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};
const viewport = () => ({
  width: document.documentElement.clientWidth,
  height: window.innerHeight,
});

const findAnchor = (anchors: string[], near: boolean) => {
  for (const sel of anchors) {
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      if (el.getClientRects().length === 0) continue; // hidden (e.g. the phone nav)
      if (near && !nearViewport(rectOf(el), window.innerHeight)) continue;
      return el;
    }
  }
  return null;
};

/** Poll once per frame (cheaper than observing the whole DOM) until found or timed out. */
async function waitForAnchor(anchors: string[], near: boolean, stale: () => boolean) {
  const until = performance.now() + ANCHOR_WAIT_MS;
  for (;;) {
    const el = findAnchor(anchors, near);
    if (el || stale() || performance.now() > until) return el;
    await frame();
  }
}

/** Resolve when a smooth scroll has come to rest (scrollend, or 4 still frames). */
async function scrollSettled() {
  const until = performance.now() + SCROLL_WAIT_MS;
  let ended = false;
  const onEnd = () => (ended = true);
  window.addEventListener('scrollend', onEnd, { once: true });
  let last = window.scrollY;
  let still = 0;
  await frame();
  while (!ended && still < 4 && performance.now() < until) {
    await frame();
    still = window.scrollY === last ? still + 1 : 0;
    last = window.scrollY;
  }
  window.removeEventListener('scrollend', onEnd);
}

/** On arrival, let fonts and hydrating islands settle before measuring anything. */
async function pageSettled() {
  await Promise.race([document.fonts?.ready, wait(600)]);
  await new Promise<void>((r) =>
    'requestIdleCallback' in window
      ? requestIdleCallback(() => r(), { timeout: 600 })
      : setTimeout(r, 50),
  );
  await frame();
}

/**
 * The guided tour (A61, motion reworked in A85): a non-modal, step-by-step card with a
 * spotlight on the part of the page it describes. Its position is kept in localStorage,
 * so it follows the reader from page to page; a click on any `[data-tour-start]` element
 * restarts it. Before it changes page it points at the link that goes there.
 *
 * Motion: every step first scrolls its target into view (smoothly), then glides the
 * spotlight and card there with one CSS transform transition. Scroll/resize tracking
 * measures once per frame and writes styles directly — no re-render per frame.
 */
export default function Tour({ steps, langBase, autoStart = true, ui }: Props) {
  /** Where the tour is heading. */
  const [view, setView] = useState<View>({ kind: 'off' });
  /** What the card shows — lags `view` while the page scrolls to the next target. */
  const [shown, setShown] = useState<{ view: View; via: Via } | null>(null);
  const [dontShow, setDontShow] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const spot = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  /** The element the spotlight follows. */
  const target = useRef<HTMLElement | null>(null);
  /** Whether the overlay has appeared on this page load (then later steps glide). */
  const appeared = useRef(false);
  /** While true the card stays put (the page is scrolling towards the next target). */
  const travelling = useRef(false);
  const lastWrite = useRef('');
  const viewRef = useRef(view);
  viewRef.current = view;
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
    const back = opener.current?.isConnected ? opener.current : document.getElementById('main');
    back?.focus({ preventScroll: true });
    opener.current = null;
    const off = () => {
      if (viewRef.current.kind !== 'off') {
        root.current?.removeAttribute('data-leaving'); // restarted while fading out
        return;
      }
      setShown(null);
      appeared.current = false;
      target.current = null;
      lastWrite.current = '';
    };
    // Fade out rather than vanish.
    setView({ kind: 'off' }); // stops the step logic; the overlay stays until faded
    viewRef.current = { kind: 'off' };
    if (!appeared.current || reducedMotion()) return off();
    root.current?.setAttribute('data-leaving', '');
    setTimeout(off, FADE_MS);
  };

  /** Fade the overlay out, then load the page that holds `step`. */
  const leave = (step: number, to: string) => {
    persist(step);
    const carry = storageOk.current ? '' : `?${TOUR_PARAM}=${step}`;
    root.current?.setAttribute('data-leaving', '');
    const href = langBase + to + carry;
    if (reducedMotion()) location.href = href;
    else setTimeout(() => (location.href = href), FADE_MS);
  };

  const go = (to: number) => {
    const cur = viewRef.current;
    const move = moveTo(steps, to, page);
    if (move.kind === 'finish') return finish(true);
    if (move.kind === 'go') {
      // Forward onto another page: first point at the link that goes there.
      if (cur.kind === 'show' && to > cur.step)
        return setView({ kind: 'bridge', from: cur.step, to });
      return leave(move.step, move.page);
    }
    persist(move.step);
    setView({ kind: 'show', step: move.step });
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
    // Back from the next page via the bfcache: undo the fade-out that preceded leaving.
    const restored = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      root.current?.removeAttribute('data-leaving');
    };
    window.addEventListener('pageshow', restored);
    return () => {
      document.removeEventListener('click', start);
      window.removeEventListener('pageshow', restored);
    };
  }, []);

  /** Measure (reads only), for the current target and card. */
  const measure = (): Placement | null => {
    const c = card.current;
    if (!c) return null;
    const el = target.current?.isConnected ? target.current : null;
    return placeCard(
      el ? rectOf(el) : null,
      { width: c.offsetWidth, height: c.offsetHeight },
      viewport(),
    );
  };

  /** Apply a placement (writes only). */
  const apply = (p: Placement) => {
    const s = spot.current;
    const c = card.current;
    if (!s || !c) return;
    const vp = viewport();
    const r = p.spot ?? { top: vp.height / 2, left: vp.width / 2, width: 0, height: 0 };
    const key = `${r.top}|${r.left}|${r.width}|${r.height}|${p.card.x}|${p.card.y}|${travelling.current}`;
    if (key === lastWrite.current) return;
    lastWrite.current = key;
    s.style.transform = `translate3d(${r.left}px, ${r.top}px, 0)`;
    s.style.width = `${r.width}px`;
    s.style.height = `${r.height}px`;
    s.toggleAttribute('data-ring', !!p.spot && r.height > 0);
    if (!travelling.current) c.style.transform = `translate3d(${p.card.x}px, ${p.card.y}px, 0)`;
  };

  // Follow the target while the page scrolls, resizes or reflows: one measurement per frame.
  const active = shown !== null;
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const track = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const p = measure();
        if (p) apply(p);
      });
    };
    window.addEventListener('scroll', track, { capture: true, passive: true });
    window.addEventListener('resize', track);
    const ro = new ResizeObserver(track);
    ro.observe(document.documentElement);
    if (card.current) ro.observe(card.current);
    const observeTarget = setInterval(() => {
      if (target.current?.isConnected) ro.observe(target.current);
    }, 500);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(observeTarget);
      window.removeEventListener('scroll', track, { capture: true });
      window.removeEventListener('resize', track);
      ro.disconnect();
    };
  }, [active]);

  // Each move: find the target, scroll it into view, then glide there.
  const viewKey = JSON.stringify(view);
  useEffect(() => {
    if (view.kind !== 'show' && view.kind !== 'bridge') return;
    let stale = false;
    // Marks a move in progress (until the glide or fade-in ends) — also a test hook.
    root.current?.setAttribute('data-busy', '');
    (async () => {
      const bridge = view.kind === 'bridge';
      const anchors = bridge
        ? bridgeSelectors(langBase, steps[view.to].page ?? '')
        : steps[view.step].anchors;
      const el = anchors.length ? await waitForAnchor(anchors, bridge, () => stale) : null;
      if (stale) return;
      // Nothing nearby leads there: a card pointing at nothing is just an extra click.
      if (bridge && !el) return leave(view.to, steps[view.to].page ?? '');
      if (!appeared.current) await pageSettled();
      if (stale) return;
      if (el) {
        const c = card.current;
        const delta = scrollDelta(
          rectOf(el),
          { width: c?.offsetWidth ?? 352, height: Math.max(c?.offsetHeight ?? 0, 160) },
          viewport(),
          {
            y: window.scrollY,
            max: document.documentElement.scrollHeight - window.innerHeight,
          },
        );
        if (Math.abs(delta) > 1) {
          // The card fades while the page scrolls; the spotlight rides with the page.
          travelling.current = true;
          root.current?.setAttribute('data-travel', '');
          window.scrollBy({ top: delta, behavior: reducedMotion() ? 'auto' : 'smooth' });
          await scrollSettled();
          if (stale) return;
        }
      }
      target.current = el;
      const via: Via = el?.matches('[data-menu-toggle]') ? 'menu' : 'link';
      setShown({ view, via }); // the glide itself runs once the new text has rendered
    })();
    return () => {
      stale = true;
    };
  }, [viewKey]);

  // The card now shows the new step: measure it and glide (or fade in on arrival).
  useLayoutEffect(() => {
    if (!shown) return;
    const r = root.current;
    const p = measure();
    if (!r || !p) return;
    travelling.current = false;
    r.removeAttribute('data-travel');
    if (appeared.current) {
      r.setAttribute('data-glide', '');
      apply(p);
      const t = setTimeout(() => {
        r.removeAttribute('data-glide');
        r.removeAttribute('data-busy');
      }, MOVE_MS + 40);
      card.current?.focus({ preventScroll: true });
      return () => clearTimeout(t);
    }
    apply(p);
    appeared.current = true;
    // Next frame, so the first position is painted before the fade starts.
    const raf = requestAnimationFrame(() => r.setAttribute('data-visible', ''));
    const t = setTimeout(() => r.removeAttribute('data-busy'), FADE_MS + 40);
    card.current?.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [shown]);

  // While a bridge card is up: a click on any link to the next page continues the tour
  // (with the fade and the ?tour carry), and opening the phone menu retargets the link.
  useEffect(() => {
    if (shown?.view.kind !== 'bridge') return;
    const { to } = shown.view;
    const dest = steps[to].page;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey)
        return;
      if (pageOf(new URL(a.href, location.href).pathname, langBase) !== dest) return;
      e.preventDefault();
      leave(to, dest ?? '');
    };
    document.addEventListener('click', onClick, true);
    const header = document.querySelector('[data-site-header]');
    const mo = new MutationObserver(() => {
      const el = findAnchor(bridgeSelectors(langBase, dest ?? ''), true);
      if (!el || el === target.current) return;
      target.current = el;
      setShown({ view: shown.view, via: el.matches('[data-menu-toggle]') ? 'menu' : 'link' });
    });
    if (header) mo.observe(header, { attributes: true, attributeFilter: ['data-open'] });
    return () => {
      document.removeEventListener('click', onClick, true);
      mo.disconnect();
    };
  }, [shown]);

  useEffect(() => {
    if (view.kind !== 'show' && view.kind !== 'bridge') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      // Let a field (the search box) and an open mobile menu have their Escape first.
      const t = e.target as HTMLElement | null;
      if (isTypingTarget(t) && !card.current?.contains(t)) return;
      if (document.querySelector('[data-site-header][data-open]')) return;
      e.preventDefault(); // handled: other Escape listeners (the Explorer's panel) stand down
      finish(view.kind === 'show' && view.step === 0 ? dontShow : false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [view, dontShow]);

  const total = steps.length - 1; // the welcome card is not counted as a step

  if (view.kind === 'resume') {
    return (
      <div class="tour-pill fixed bottom-4 left-4 flex items-center gap-2 rounded border border-border-strong bg-surface px-3 py-2 text-sm shadow-lg print:hidden">
        <button
          type="button"
          class="text-accent hover:underline"
          onClick={() => go(view.step)}
          data-tour-resume
        >
          {fillCount(ui.tourContinue, view.step, total)} →
        </button>
        <button type="button" class="text-subtle hover:text-fg-soft" onClick={() => finish(false)}>
          {ui.tourEnd}
        </button>
      </div>
    );
  }
  if (view.kind === 'off' && !shown) return null;

  const titleId = 'tour-title';
  const bodyId = 'tour-body';
  const btn = 'rounded border px-3 py-1.5 text-sm';
  const primary = `${btn} border-amber-400 bg-amber-400 font-medium text-on-accent hover:bg-amber-300`;
  const secondary = `${btn} border-border-strong text-fg-soft hover:border-border-hover`;
  const sv = shown?.view;
  const step = sv?.kind === 'show' ? sv.step : sv?.kind === 'bridge' ? sv.from : 0;
  const bridge = sv?.kind === 'bridge' ? sv : null;
  const welcome = !bridge && step === 0;
  const last = !bridge && step === steps.length - 1;
  const current = steps[bridge ? bridge.to : step];
  const bridgeBody = shown?.via === 'menu' ? ui.tourBridgeMenu : ui.tourBridgeLink;

  return (
    <div class="print:hidden" data-tour-overlay ref={root}>
      <div aria-hidden="true" class="tour-spot" ref={spot} />
      <div
        ref={card}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        class="tour-card max-h-[60vh] overflow-y-auto rounded border border-border-strong bg-surface p-4 text-fg shadow-2xl focus:outline-none"
      >
        <div class="mb-1 flex items-start justify-between gap-4">
          <h2 id={titleId} class="text-base font-semibold">
            {bridge ? (current.via ?? current.title) : current.title}
          </h2>
          <button
            type="button"
            aria-label={ui.tourClose}
            title={ui.tourClose}
            class="-mt-1 -mr-1 px-1 text-lg leading-none text-subtle hover:text-fg"
            onClick={() => finish(welcome ? dontShow : false)}
          >
            ×
          </button>
        </div>
        <p id={bodyId} class="text-sm text-fg-soft">
          {bridge ? bridgeBody : current.body}
        </p>
        {welcome ? (
          <div class="mt-4 space-y-3">
            <div class="flex flex-wrap gap-2">
              <button type="button" class={primary} onClick={() => go(1)}>
                {ui.tourWelcomeStart}
              </button>
              <button type="button" class={secondary} onClick={() => finish(dontShow)}>
                {ui.tourNotNow}
              </button>
            </div>
            <label class="flex items-center gap-2 text-xs text-muted">
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
            <span class="text-xs text-subtle" aria-live="polite">
              {/* No count on the way from the welcome card: it is not a step. */}
              {(bridge ? bridge.from : step) > 0 &&
                fillCount(ui.tourStepOf, bridge ? bridge.from : step, total)}
            </span>
            <div class="flex gap-2">
              {(bridge || step > 1) && (
                <button
                  type="button"
                  class={secondary}
                  onClick={() =>
                    bridge ? setView({ kind: 'show', step: bridge.from }) : go(step - 1)
                  }
                >
                  {ui.tourBack}
                </button>
              )}
              <button
                type="button"
                class={primary}
                onClick={() =>
                  bridge ? leave(bridge.to, steps[bridge.to].page ?? '') : go(step + 1)
                }
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
