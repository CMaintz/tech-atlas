/**
 * The site's modal dialog shell (About, Feedback). A native modal <dialog> gives
 * focus containment, an inert page behind it and the top layer; this adds Esc (with
 * preventDefault, so the tour and term panel stand down — and stopPropagation, so Esc in
 * the Feedback dialog opened from About closes only Feedback), backdrop click, a close
 * button, and focus back on the opener.
 */
import type { ComponentChildren, JSX, RefObject } from 'preact';
import { useRef } from 'preact/hooks';

export type DialogHandle = {
  ref: RefObject<HTMLDialogElement>;
  /** The button that opens the dialog; focus returns to it on close. */
  opener: RefObject<HTMLButtonElement>;
  open: () => void;
  close: () => void;
};

export function useDialog(): DialogHandle {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  return {
    ref,
    opener,
    open: () => ref.current?.showModal(),
    close: () => ref.current?.close(),
  };
}

/** Backdrop click and Esc close the dialog; closing puts focus back on the opener. */
function dialogEvents(dialog: DialogHandle) {
  return {
    onClick: (e: MouseEvent) => {
      // A click on the dialog box itself (not its content) is a click on the backdrop.
      if (e.target === dialog.ref.current) dialog.close();
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault(); // handled: an outer dialog, the tour and term panel leave it alone
      e.stopPropagation();
      dialog.close();
    },
    onClose: () => dialog.opener.current?.focus(),
  };
}

type CloseProps = {
  /** The close button's accessible name. */
  label: string;
  /** Focus the close button on open (else the first `autofocus` inside). */
  autofocus?: boolean;
};

const CloseButton = ({ label, autofocus, onClick }: CloseProps & { onClick: () => void }) => (
  <button
    type="button"
    autofocus={autofocus}
    aria-label={label}
    title={label}
    onClick={onClick}
    class="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full border border-border-strong text-muted hover:border-border-hover hover:text-fg"
  >
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" />
    </svg>
  </button>
);

type Props = Omit<JSX.HTMLAttributes<HTMLDialogElement>, 'ref' | 'class'> & {
  dialog: DialogHandle;
  close: CloseProps;
  /** Classes of the padded box inside the dialog. */
  bodyClass: string;
  children: ComponentChildren;
};

const DIALOG_CLASS =
  'about-dialog m-auto w-[calc(100%-2rem)] max-w-[30rem] rounded-2xl border border-border bg-bg p-0 text-fg shadow-2xl shadow-black/70';

export default function Dialog({ dialog, close, bodyClass, children, ...rest }: Props) {
  return (
    <dialog {...rest} ref={dialog.ref} class={DIALOG_CLASS} {...dialogEvents(dialog)}>
      <div class={bodyClass}>
        <CloseButton {...close} onClick={dialog.close} />
        {children}
      </div>
    </dialog>
  );
}
