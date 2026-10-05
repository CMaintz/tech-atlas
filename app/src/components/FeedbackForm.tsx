/** The Feedback dialog's form: its fields, the error line and the buttons. */
import type { ComponentChildren } from 'preact';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MAX_CHARS,
  feedbackCounter,
  feedbackError,
  type FeedbackCategory,
  type FeedbackUi,
} from '../lib/feedback';
import type { useFeedbackForm } from '../lib/use-feedback-form';

const FIELD =
  'w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-base text-fg sm:text-sm focus:border-border-hover';
const LABEL = 'block text-sm font-semibold text-fg';
export const FEEDBACK_BUTTON =
  'inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm disabled:opacity-50';
export const QUIET_BUTTON = `${FEEDBACK_BUTTON} border-border-strong text-fg-soft hover:border-border-hover hover:text-fg`;

/** Element ids, minted by the dialog, so it can focus an invalid field by id. */
export type FeedbackIds = Record<
  'title' | 'intro' | 'message' | 'counter' | 'email' | 'emailHint' | 'category' | 'honeypot',
  string
>;

type FormState = ReturnType<typeof useFeedbackForm>;
type FieldProps = { ids: FeedbackIds; ui: FeedbackUi; state: FormState };

type LabelledProps = { id: string; label: string; children: ComponentChildren };

/** A labelled field: the label above its control (and any hint). */
const Field = ({ id, label, children }: LabelledProps) => (
  <div class="space-y-1.5">
    <label for={id} class={LABEL}>
      {label}
    </label>
    {children}
  </div>
);

/** The small print under a field, which the field points to with aria-describedby. */
const Hint = ({ id, children }: { id: string; children: ComponentChildren }) => (
  <p id={id} class="text-xs text-subtle">
    {children}
  </p>
);

const CategoryField = ({ ids, ui, state }: FieldProps) => (
  <Field id={ids.category} label={ui.category}>
    <select
      id={ids.category}
      value={state.form.category}
      onChange={(e) => state.setField('category', e.currentTarget.value as FeedbackCategory)}
      class={`${FIELD} min-h-11 sm:min-h-0`}
    >
      {FEEDBACK_CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {ui[c]}
        </option>
      ))}
    </select>
  </Field>
);

const MessageField = ({ ids, ui, state }: FieldProps) => (
  <Field id={ids.message} label={ui.message}>
    <textarea
      id={ids.message}
      autofocus
      required
      rows={5}
      maxLength={FEEDBACK_MAX_CHARS}
      value={state.form.message}
      aria-invalid={state.issue === 'message' ? 'true' : undefined}
      aria-describedby={ids.counter}
      onInput={(e) => state.setField('message', e.currentTarget.value)}
      class={`${FIELD} resize-y`}
    />
    <Hint id={ids.counter}>{feedbackCounter(state.form.message.length, ui)}</Hint>
  </Field>
);

const EmailField = ({ ids, ui, state }: FieldProps) => (
  <Field id={ids.email} label={ui.email}>
    <input
      id={ids.email}
      type="email"
      autocomplete="email"
      inputMode="email"
      value={state.form.email}
      aria-invalid={state.issue === 'email' ? 'true' : undefined}
      aria-describedby={ids.emailHint}
      onInput={(e) => state.setField('email', e.currentTarget.value)}
      class={FIELD}
    />
    <Hint id={ids.emailHint}>{ui.emailHint}</Hint>
  </Field>
);

/** Honeypot: off-screen and out of the tab order; people leave it empty. */
const Honeypot = ({ ids, ui, state }: FieldProps) => (
  <div aria-hidden="true" class="absolute -left-[9999px] h-px w-px overflow-hidden">
    <label for={ids.honeypot}>{ui.honeypot}</label>
    <input
      id={ids.honeypot}
      type="text"
      name="website"
      tabIndex={-1}
      autocomplete="off"
      value={state.form.website}
      onInput={(e) => state.setField('website', e.currentTarget.value)}
    />
  </div>
);

type ActionsProps = { ui: FeedbackUi; sending: boolean; close: () => void; privacyHref: string };

const SendButton = ({ ui, sending }: { ui: FeedbackUi; sending: boolean }) => (
  <button
    type="submit"
    disabled={sending}
    aria-busy={sending ? 'true' : undefined}
    class={`${FEEDBACK_BUTTON} border-amber-500/70 bg-amber-400/20 font-semibold text-fg hover:bg-amber-400/30`}
  >
    {sending ? ui.sending : ui.send}
  </button>
);

const FormActions = ({ ui, sending, close, privacyHref }: ActionsProps) => (
  <div class="flex flex-wrap items-center gap-2">
    <SendButton ui={ui} sending={sending} />
    <button type="button" onClick={close} class={QUIET_BUTTON}>
      {ui.cancel}
    </button>
    <a
      href={privacyHref}
      class="ml-auto inline-flex min-h-11 items-center text-xs text-subtle underline hover:text-fg-soft sm:min-h-0"
    >
      {ui.privacy}
    </a>
  </div>
);

type Props = FieldProps & { onSubmit: (e: Event) => void; close: () => void; privacyHref: string };

export default function FeedbackForm(props: Props) {
  const { ui, state } = props;
  return (
    <form class="space-y-4" noValidate onSubmit={props.onSubmit}>
      <CategoryField {...props} />
      <MessageField {...props} />
      <EmailField {...props} />
      <Honeypot {...props} />
      <p role="alert" aria-live="assertive" class="min-h-5 text-sm text-red-700 dark:text-red-300">
        {feedbackError(state.issue, state.status, ui)}
      </p>
      <FormActions {...props} sending={state.status === 'sending'} />
    </form>
  );
}
