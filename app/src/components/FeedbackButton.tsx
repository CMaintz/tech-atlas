import { useId, useRef, useState } from 'preact/hooks';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MAX_CHARS,
  feedbackBody,
  feedbackIssue,
  sendFeedback,
  type FeedbackCategory,
  type FeedbackProps,
} from '../lib/feedback';

type Props = NonNullable<FeedbackProps> & {
  /** 'link': a plain footer link. 'pill': a rounded button (inside the About dialog). */
  variant?: 'link' | 'pill';
};

type Status = 'idle' | 'sending' | 'sent' | 'limited' | 'failed';

const FIELD =
  'w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-base text-fg sm:text-sm focus:border-border-hover';
const LABEL = 'block text-sm font-semibold text-fg';
const BUTTON =
  'inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm disabled:opacity-50';

/**
 * The Feedback dialog and the button that opens it (A100). A native modal <dialog>, like
 * the About dialog: focus containment, an inert page behind it, Esc and backdrop click
 * close it, focus returns to the opener. Rendered only when the build has a feedback
 * function URL (feedbackProps returns null otherwise).
 */
export default function FeedbackButton({ url, lang, ui, privacyHref, variant = 'link' }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const introId = useId();
  const messageId = useId();
  const counterId = useId();
  const emailId = useId();
  const emailHintId = useId();
  const categoryId = useId();
  const honeypotId = useId();

  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [issue, setIssue] = useState<'message' | 'email' | null>(null);

  const open = () => {
    if (status !== 'sending') setStatus('idle');
    setIssue(null);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();
  const reset = () => {
    setMessage('');
    setEmail('');
    setWebsite('');
    setIssue(null);
    setStatus('idle');
  };

  const submit = async (e: Event) => {
    e.preventDefault();
    if (status === 'sending') return;
    const form = { category, message, email, website };
    const problem = feedbackIssue(form);
    setIssue(problem);
    if (problem) {
      const el = dialog.current?.querySelector<HTMLElement>(
        `#${CSS.escape(problem === 'message' ? messageId : emailId)}`,
      );
      el?.focus();
      return;
    }
    setStatus('sending');
    const result = await sendFeedback(url, feedbackBody(form, location.pathname, lang));
    setStatus(result);
    if (result === 'sent') {
      setMessage('');
      setEmail('');
      setWebsite('');
    }
  };

  const maxText = String(FEEDBACK_MAX_CHARS);
  const error =
    issue === 'message'
      ? ui.errorMessage.replace('{max}', maxText)
      : issue === 'email'
        ? ui.errorEmail
        : status === 'limited'
          ? ui.errorLimited
          : status === 'failed'
            ? ui.errorFailed
            : '';

  return (
    <>
      <button
        ref={opener}
        type="button"
        aria-haspopup="dialog"
        onClick={open}
        class={
          variant === 'pill'
            ? 'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border-strong px-3 py-1 text-sm text-fg-soft hover:border-border-hover hover:text-fg sm:min-h-0'
            : 'hover:text-fg-soft'
        }
      >
        {ui.feedback}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={introId}
        data-feedback-dialog
        class="about-dialog m-auto w-[calc(100%-2rem)] max-w-[30rem] rounded-2xl border border-border bg-bg p-0 text-fg shadow-2xl shadow-black/70"
        onClick={(e) => {
          // A click on the dialog box itself (not its content) is a click on the backdrop.
          if (e.target === dialog.current) close();
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Escape') return;
          e.preventDefault(); // handled: the About dialog, tour and term panel leave it alone
          e.stopPropagation();
          close();
        }}
        onClose={() => opener.current?.focus()}
      >
        <div class="relative space-y-5 px-6 pt-7 pb-7 text-left sm:px-8">
          <button
            type="button"
            aria-label={ui.close}
            title={ui.close}
            onClick={close}
            class="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full border border-border-strong text-muted hover:border-border-hover hover:text-fg"
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" />
            </svg>
          </button>
          <div class="space-y-2 pr-12">
            <h2 id={titleId} class="text-2xl leading-tight font-bold tracking-tight">
              {ui.title}
            </h2>
            <p id={introId} class="text-sm leading-relaxed text-fg-soft">
              {ui.intro}
            </p>
          </div>

          {status === 'sent' ? (
            <div class="space-y-4">
              <p role="status" class="text-base text-fg">
                {ui.sent}
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  autofocus
                  onClick={close}
                  class={`${BUTTON} border-border-strong bg-surface-2 text-fg hover:border-border-hover`}
                >
                  {ui.close}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  class={`${BUTTON} border-border-strong text-fg-soft hover:border-border-hover hover:text-fg`}
                >
                  {ui.sendAnother}
                </button>
              </div>
            </div>
          ) : (
            <form class="space-y-4" noValidate onSubmit={submit}>
              <div class="space-y-1.5">
                <label for={categoryId} class={LABEL}>
                  {ui.category}
                </label>
                <select
                  id={categoryId}
                  value={category}
                  onChange={(e) => setCategory(e.currentTarget.value as FeedbackCategory)}
                  class={`${FIELD} min-h-11 sm:min-h-0`}
                >
                  {FEEDBACK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {ui[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div class="space-y-1.5">
                <label for={messageId} class={LABEL}>
                  {ui.message}
                </label>
                <textarea
                  id={messageId}
                  autofocus
                  required
                  rows={5}
                  maxLength={FEEDBACK_MAX_CHARS}
                  value={message}
                  aria-invalid={issue === 'message' ? 'true' : undefined}
                  aria-describedby={counterId}
                  onInput={(e) => setMessage(e.currentTarget.value)}
                  class={`${FIELD} resize-y`}
                />
                <p id={counterId} class="text-xs text-subtle">
                  {ui.messageHint.replace('{n}', String(message.length)).replace('{max}', maxText)}
                </p>
              </div>
              <div class="space-y-1.5">
                <label for={emailId} class={LABEL}>
                  {ui.email}
                </label>
                <input
                  id={emailId}
                  type="email"
                  autocomplete="email"
                  inputMode="email"
                  value={email}
                  aria-invalid={issue === 'email' ? 'true' : undefined}
                  aria-describedby={emailHintId}
                  onInput={(e) => setEmail(e.currentTarget.value)}
                  class={FIELD}
                />
                <p id={emailHintId} class="text-xs text-subtle">
                  {ui.emailHint}
                </p>
              </div>
              {/* Honeypot: off-screen and out of the tab order; people leave it empty. */}
              <div aria-hidden="true" class="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label for={honeypotId}>{ui.honeypot}</label>
                <input
                  id={honeypotId}
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autocomplete="off"
                  value={website}
                  onInput={(e) => setWebsite(e.currentTarget.value)}
                />
              </div>
              <p
                role="alert"
                aria-live="assertive"
                class="min-h-5 text-sm text-red-700 dark:text-red-300"
              >
                {error}
              </p>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  aria-busy={status === 'sending' ? 'true' : undefined}
                  class={`${BUTTON} border-amber-500/70 bg-amber-400/20 font-semibold text-fg hover:bg-amber-400/30`}
                >
                  {status === 'sending' ? ui.sending : ui.send}
                </button>
                <button
                  type="button"
                  onClick={close}
                  class={`${BUTTON} border-border-strong text-fg-soft hover:border-border-hover hover:text-fg`}
                >
                  {ui.cancel}
                </button>
                <a
                  href={privacyHref}
                  class="ml-auto inline-flex min-h-11 items-center text-xs text-subtle underline hover:text-fg-soft sm:min-h-0"
                >
                  {ui.privacy}
                </a>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
