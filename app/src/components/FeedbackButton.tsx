import { useId } from 'preact/hooks';
import type { FeedbackProps, FeedbackUi } from '../lib/feedback';
import { useFeedbackForm } from '../lib/use-feedback-form';
import FeedbackForm, { FEEDBACK_BUTTON, QUIET_BUTTON, type FeedbackIds } from './FeedbackForm';
import Dialog, { useDialog, type DialogHandle } from './ui/Dialog';

type Props = NonNullable<FeedbackProps> & {
  /** 'link': a plain footer link. 'pill': a rounded button (inside the About dialog). */
  variant?: 'link' | 'pill';
};

type FormState = ReturnType<typeof useFeedbackForm>;

const OPENER_CLASS = {
  pill: 'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border-strong px-3 py-1 text-sm text-fg-soft hover:border-border-hover hover:text-fg sm:min-h-0',
  link: 'hover:text-fg-soft',
};
const SENT_CLOSE = `${FEEDBACK_BUTTON} border-border-strong bg-surface-2 text-fg hover:border-border-hover`;

function useFeedbackIds(): FeedbackIds {
  return {
    title: useId(),
    intro: useId(),
    message: useId(),
    counter: useId(),
    email: useId(),
    emailHint: useId(),
    category: useId(),
    honeypot: useId(),
  };
}

type SentProps = { ui: FeedbackUi; close: () => void; reset: () => void };

/** After a send: the thanks, "Close" and "Send more". */
const FeedbackSent = ({ ui, close, reset }: SentProps) => (
  <div class="space-y-4">
    <p role="status" class="text-base text-fg">
      {ui.sent}
    </p>
    <div class="flex flex-wrap gap-2">
      <button type="button" autofocus onClick={close} class={SENT_CLOSE}>
        {ui.close}
      </button>
      <button type="button" onClick={reset} class={QUIET_BUTTON}>
        {ui.sendAnother}
      </button>
    </div>
  </div>
);

const FeedbackHeader = ({ ui, ids }: { ui: FeedbackUi; ids: FeedbackIds }) => (
  <div class="space-y-2 pr-12">
    <h2 id={ids.title} class="text-2xl leading-tight font-bold tracking-tight">
      {ui.title}
    </h2>
    <p id={ids.intro} class="text-sm leading-relaxed text-fg-soft">
      {ui.intro}
    </p>
  </div>
);

/** Submit: check the form, and on a problem focus the field it is about. */
function submitHandler(dialog: DialogHandle, ids: FeedbackIds, submit: FormState['submit']) {
  return (e: Event) => {
    e.preventDefault();
    void submit((field) => {
      const id = field === 'message' ? ids.message : ids.email;
      dialog.ref.current?.querySelector<HTMLElement>(`#${CSS.escape(id)}`)?.focus();
    });
  };
}

type DialogProps = Props & { dialog: DialogHandle; state: FormState };

/** The thanks once sent, else the form. */
function FeedbackContent({
  dialog,
  state,
  ui,
  privacyHref,
  ids,
}: DialogProps & { ids: FeedbackIds }) {
  if (state.status === 'sent') {
    return <FeedbackSent ui={ui} close={dialog.close} reset={state.reset} />;
  }
  const onSubmit = submitHandler(dialog, ids, state.submit);
  return <FeedbackForm {...{ ids, ui, state, onSubmit, privacyHref }} close={dialog.close} />;
}

function FeedbackDialog(props: DialogProps) {
  const { dialog, ui } = props;
  const ids = useFeedbackIds();
  return (
    <Dialog
      dialog={dialog}
      close={{ label: ui.close }}
      bodyClass="relative space-y-5 px-6 pt-7 pb-7 text-left sm:px-8"
      aria-labelledby={ids.title}
      aria-describedby={ids.intro}
      data-feedback-dialog
    >
      <FeedbackHeader ui={ui} ids={ids} />
      <FeedbackContent {...props} ids={ids} />
    </Dialog>
  );
}

type OpenerProps = Pick<Props, 'ui'> & {
  variant: NonNullable<Props['variant']>;
  dialog: DialogHandle;
  open: () => void;
};

const FeedbackOpener = ({ ui, variant, dialog, open }: OpenerProps) => (
  <button
    ref={dialog.opener}
    type="button"
    aria-haspopup="dialog"
    onClick={open}
    class={OPENER_CLASS[variant]}
  >
    {ui.feedback}
  </button>
);

/**
 * The Feedback dialog and the button that opens it (A100). A native modal <dialog>, like
 * the About dialog (ui/Dialog): focus containment, an inert page behind it, Esc and
 * backdrop click close it, focus returns to the opener. Rendered only when the build has
 * a feedback function URL (feedbackProps returns null otherwise).
 */
export default function FeedbackButton({ variant = 'link', ...props }: Props) {
  const dialog = useDialog();
  const state = useFeedbackForm(props.url, props.lang);
  const open = () => {
    state.prepare();
    dialog.open();
  };
  return (
    <>
      <FeedbackOpener ui={props.ui} variant={variant} dialog={dialog} open={open} />
      <FeedbackDialog {...props} dialog={dialog} state={state} />
    </>
  );
}
