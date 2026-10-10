import type { RefObject } from 'preact';
import { useId } from 'preact/hooks';
import type { AboutProps } from '../lib/about-assets';
import { CreditsAndThanks, EYEBROW_LABEL } from './AboutPeople';
import FeedbackButton from './FeedbackButton';
import Dialog, { useDialog, type DialogHandle } from './ui/Dialog';

type Props = AboutProps & {
  variant?: 'circle' | 'link';
};

type Ui = AboutProps['ui'];

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

type OpenerProps = { ui: Ui; opener: RefObject<HTMLButtonElement>; open: () => void };

const CIRCLE =
  'flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-bg/85 font-serif text-lg leading-none text-fg-soft italic shadow-lg shadow-black/40 backdrop-blur transition-colors hover:border-border-hover hover:text-fg';
const CIRCLE_LABEL =
  'pointer-events-none absolute top-full mt-1.5 rounded bg-surface-2 px-2 py-0.5 text-xs whitespace-nowrap text-fg-soft opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100';

const CircleOpener = ({ ui, opener, open }: OpenerProps) => (
  <div class="group relative flex flex-col items-center">
    <button
      ref={opener}
      type="button"
      aria-label={ui.about}
      aria-haspopup="dialog"
      onClick={open}
      class={CIRCLE}
    >
      <span aria-hidden="true">i</span>
    </button>
    <span aria-hidden="true" class={CIRCLE_LABEL}>
      {ui.about}
    </span>
  </div>
);

const LinkOpener = ({ ui, opener, open }: OpenerProps) => (
  <button
    ref={opener}
    type="button"
    aria-haspopup="dialog"
    onClick={open}
    class="hover:text-fg-soft"
  >
    {ui.about}
  </button>
);

const ExternalLink = ({ ui, link }: { ui: Ui; link: Props['links'][number] }) => (
  <a
    href={link.href}
    target="_blank"
    rel="noopener noreferrer"
    class="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border-strong px-3 py-1 text-sm sm:min-h-0 text-fg-soft hover:border-border-hover hover:text-fg"
  >
    {link.label}
    <ExternalIcon />
    <span class="sr-only">{ui.opensInNewTab}</span>
  </a>
);

function AboutLinks({ ui, links, feedback }: Pick<Props, 'ui' | 'links' | 'feedback'>) {
  if (links.length === 0 && !feedback) return null;
  return (
    <ul class="flex flex-wrap gap-2">
      {links.map((l) => (
        <li key={l.id}>
          <ExternalLink ui={ui} link={l} />
        </li>
      ))}
      {feedback && (
        <li>
          <FeedbackButton {...feedback} variant="pill" />
        </li>
      )}
    </ul>
  );
}

const VersionLine = ({ ui, version }: Pick<Props, 'ui' | 'version'>) => (
  <p class="text-xs text-subtle">
    <a
      href={version.href}
      target="_blank"
      rel="noopener noreferrer"
      class="hover:text-fg-soft hover:underline"
      title={ui.releaseNotes}
    >
      Atlas {version.label}
      <span class="sr-only">
        {' '}
        ({ui.releaseNotes}) {ui.opensInNewTab}
      </span>
    </a>
  </p>
);

type IntroProps = Pick<Props, 'ui' | 'links' | 'feedback'> & { titleId: string; bodyId: string };

const AboutIntro = ({ ui, titleId, bodyId, ...props }: IntroProps) => (
  <>
    <div class="space-y-4 pr-10">
      <div>
        <p class={EYEBROW_LABEL}>{ui.about}</p>
        <h2 id={titleId} class="mt-1.5 text-3xl leading-tight font-bold tracking-tight">
          {ui.aboutTitle}
        </h2>
      </div>
    </div>
    <div id={bodyId} class="-mt-2 space-y-3 text-[15px] leading-relaxed text-fg-soft">
      <p>{ui.aboutBody}</p>
      <p>{ui.aboutBeta}</p>
    </div>
    <AboutLinks ui={ui} {...props} />
  </>
);

function AboutDialog({ dialog, ...props }: AboutProps & { dialog: DialogHandle }) {
  const titleId = useId();
  const bodyId = useId();
  return (
    <Dialog
      dialog={dialog}
      close={{ label: props.ui.close, autofocus: true }}
      bodyClass="relative space-y-6 px-7 pt-8 pb-8 sm:px-9"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      data-about-dialog
    >
      <AboutIntro {...props} titleId={titleId} bodyId={bodyId} />
      <CreditsAndThanks {...props} />
      <VersionLine {...props} />
    </Dialog>
  );
}

export default function AboutButton({ variant = 'circle', ...props }: Props) {
  const dialog = useDialog();
  const Opener = variant === 'circle' ? CircleOpener : LinkOpener;
  return (
    <>
      <Opener ui={props.ui} opener={dialog.opener} open={dialog.open} />
      <AboutDialog {...props} dialog={dialog} />
    </>
  );
}
