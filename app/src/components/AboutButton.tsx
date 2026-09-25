import { useId, useRef } from 'preact/hooks';
import { initials } from '../lib/about';
import type { AboutProps } from '../lib/about-assets';

type Props = AboutProps & {
  /** 'circle': the round "i" button (Explorer corner). 'link': a plain footer link. */
  variant?: 'circle' | 'link';
};

/** Box with an arrow leaving it up and to the right: "opens elsewhere". */
const ExternalIcon = () => (
  <svg
    aria-hidden="true"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

/** The small uppercase label above a title or section ("ABOUT", "CREDITS"). */
const EYEBROW = 'text-[11px] font-semibold tracking-[0.14em] text-subtle uppercase';

const Avatar = ({ name, photo, position }: { name: string; photo?: string; position: string }) =>
  photo ? (
    <img
      src={photo}
      alt=""
      width={48}
      height={48}
      loading="lazy"
      style={{ objectPosition: position }}
      class="h-12 w-12 shrink-0 rounded-full border border-border-strong bg-surface-2 object-cover"
    />
  ) : (
    <span
      aria-hidden="true"
      class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border-strong bg-gradient-to-br from-amber-400/30 to-surface-2 text-sm font-semibold tracking-wide text-amber-900 dark:text-amber-50"
    >
      {initials(name)}
    </span>
  );

/**
 * The About dialog and the button that opens it (A84). A native modal <dialog> gives
 * focus containment, an inert page behind it and the top layer; this adds Esc (with
 * preventDefault, so the tour and term panel stand down), backdrop click, and focus
 * back on the opener.
 */
export default function AboutButton({ ui, links, people, variant = 'circle' }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  const open = () => dialog.current?.showModal();
  const close = () => dialog.current?.close();

  const section = (key: 'credits' | 'thanks', heading: string) => {
    const list = people.filter((p) => p.section === key);
    if (list.length === 0) return null;
    return (
      <section class="space-y-3">
        <h3 class={EYEBROW}>{heading}</h3>
        <ul class="space-y-3">
          {list.map((p) => (
            <li key={p.name} class="flex items-center gap-3">
              <Avatar name={p.name} photo={p.photo} position={p.photoPosition} />
              <div>
                <div class="leading-snug font-semibold text-fg">{p.name}</div>
                <div class="text-sm leading-snug text-muted">{p.role}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  };

  return (
    <>
      {variant === 'circle' ? (
        <div class="group relative flex flex-col items-center">
          <button
            ref={opener}
            type="button"
            aria-label={ui.about}
            aria-haspopup="dialog"
            onClick={open}
            class="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-bg/85 font-serif text-lg leading-none text-fg-soft italic shadow-lg shadow-black/40 backdrop-blur transition-colors hover:border-border-hover hover:text-fg"
          >
            <span aria-hidden="true">i</span>
          </button>
          <span
            aria-hidden="true"
            class="pointer-events-none absolute top-full mt-1.5 rounded bg-surface-2 px-2 py-0.5 text-xs whitespace-nowrap text-fg-soft opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
          >
            {ui.about}
          </span>
        </div>
      ) : (
        <button
          ref={opener}
          type="button"
          aria-haspopup="dialog"
          onClick={open}
          class="hover:text-fg-soft"
        >
          {ui.about}
        </button>
      )}

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        data-about-dialog
        class="about-dialog m-auto w-[calc(100%-2rem)] max-w-[30rem] rounded-2xl border border-border bg-bg p-0 text-fg shadow-2xl shadow-black/70"
        onClick={(e) => {
          // A click on the dialog box itself (not its content) is a click on the backdrop.
          if (e.target === dialog.current) close();
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Escape') return;
          e.preventDefault(); // handled: the tour and term panel leave this Escape alone
          e.stopPropagation();
          close();
        }}
        onClose={() => opener.current?.focus()}
      >
        <div class="relative space-y-6 px-7 pt-8 pb-8 sm:px-9">
          <button
            type="button"
            autofocus
            aria-label={ui.close}
            title={ui.close}
            onClick={close}
            class="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-full border border-border-strong text-muted hover:border-border-hover hover:text-fg"
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" />
            </svg>
          </button>
          <div class="space-y-4 pr-10">
            <div>
              <p class={EYEBROW}>{ui.about}</p>
              <h2 id={titleId} class="mt-1.5 text-3xl leading-tight font-bold tracking-tight">
                {ui.aboutTitle}
              </h2>
            </div>
          </div>
          <div id={bodyId} class="-mt-2 space-y-3 text-[15px] leading-relaxed text-fg-soft">
            <p>{ui.aboutBody}</p>
            <p>{ui.aboutBeta}</p>
          </div>
          {links.length > 0 && (
            <ul class="flex flex-wrap gap-2">
              {links.map((l) => (
                <li key={l.id}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3 py-1 text-sm text-fg-soft hover:border-border-hover hover:text-fg"
                  >
                    {l.label}
                    <ExternalIcon />
                    <span class="sr-only">{ui.opensInNewTab}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          <hr class="border-border" />
          {section('credits', ui.credits)}
          {section('thanks', ui.thanks)}
        </div>
      </dialog>
    </>
  );
}
