import type { RefObject } from 'preact';
import { useId } from 'preact/hooks';
import { initials } from '../lib/about';
import type { AboutProps } from '../lib/about-assets';
import FeedbackButton from './FeedbackButton';
import Dialog, { useDialog, type DialogHandle } from './ui/Dialog';

type Props = AboutProps & {
  /** 'circle': the round "i" button (Explorer corner). 'link': a plain footer link. */
  variant?: 'circle' | 'link';
};

type Ui = AboutProps['ui'];
type Person = AboutProps['people'][number];

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

const AvatarPhoto = ({ photo, position }: { photo: string; position: string }) => (
  <img
    src={photo}
    alt=""
    width={48}
    height={48}
    loading="lazy"
    style={{ objectPosition: position }}
    class="h-12 w-12 shrink-0 rounded-full border border-border-strong bg-surface-2 object-cover"
  />
);

const AvatarInitials = ({ name }: { name: string }) => (
  <span
    aria-hidden="true"
    class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border-strong bg-gradient-to-br from-amber-400/30 to-surface-2 text-sm font-semibold tracking-wide text-amber-900 dark:text-amber-50"
  >
    {initials(name)}
  </span>
);

/** The person's photo, or their initials in a circle when there is none. */
const Avatar = ({ name, photo, position }: { name: string; photo?: string; position: string }) =>
  photo ? <AvatarPhoto photo={photo} position={position} /> : <AvatarInitials name={name} />;

/** One section of people (credits or thanks); nothing when it is empty. */
function PeopleSection({ people, heading }: { people: Person[]; heading: string }) {
  if (people.length === 0) return null;
  return (
    <section class="space-y-3">
      <h3 class={EYEBROW}>{heading}</h3>
      <ul class="space-y-3">
        {people.map((p) => (
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
}

type OpenerProps = { ui: Ui; opener: RefObject<HTMLButtonElement>; open: () => void };

const CIRCLE =
  'flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-bg/85 font-serif text-lg leading-none text-fg-soft italic shadow-lg shadow-black/40 backdrop-blur transition-colors hover:border-border-hover hover:text-fg';
/** The circle's label, shown below it on hover or focus. */
const CIRCLE_LABEL =
  'pointer-events-none absolute top-full mt-1.5 rounded bg-surface-2 px-2 py-0.5 text-xs whitespace-nowrap text-fg-soft opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100';

/** The round "i" button with its hover/focus label. */
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

/** The row of pills: external profiles, then Feedback when the build has it. */
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

/** The title, what Atlas is, and the row of links. */
const AboutIntro = ({ ui, titleId, bodyId, ...props }: IntroProps) => (
  <>
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
    <AboutLinks ui={ui} {...props} />
  </>
);

/** Below a rule: credits, then thanks, each only when it has people. */
function People({ ui, people }: Pick<Props, 'ui' | 'people'>) {
  const inSection = (key: Person['section']) => people.filter((p) => p.section === key);
  return (
    <>
      <hr class="border-border" />
      <PeopleSection people={inSection('credits')} heading={ui.credits} />
      <PeopleSection people={inSection('thanks')} heading={ui.thanks} />
    </>
  );
}

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
      <People {...props} />
      <VersionLine {...props} />
    </Dialog>
  );
}

/** The About dialog and the button that opens it; the dialog shell is ui/Dialog. */
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
