/** The signed-out account view: the email form and one button per sign-in provider. */
import { useState } from 'preact/hooks';
import { signInWith, signInWithEmail, type SyncState } from '../lib/account';
import { EMAIL_SIGNIN, signInOptions, type AuthProvider } from '../lib/auth-config';
import { AUTH_PROVIDERS } from '../lib/site';
import {
  ACCOUNT_BUTTON,
  AccountHeading,
  AccountNotices,
  DownloadProgress,
  PrivacyLink,
  type ViewProps,
} from './AccountShared';

/** What the signed-out view offers: email only behind EMAIL_SIGNIN, providers by build variable. */
const options = signInOptions({ emailSignin: EMAIL_SIGNIN, providers: AUTH_PROVIDERS });

const providerLabel: Record<AuthProvider, string> = {
  github: 'withGitHub',
  linkedin_oidc: 'withLinkedIn',
};

type EmailRowProps = Pick<ViewProps, 'ui' | 'busy'> & {
  email: string;
  setEmail: (email: string) => void;
};

/** The address field and its "send link" button, side by side. */
const EmailRow = ({ ui, busy, email, setEmail }: EmailRowProps) => (
  <div class="flex gap-2">
    <input
      id="account-email"
      type="email"
      required
      autocomplete="email"
      class="min-w-0 flex-1 rounded border border-border-strong bg-surface px-2 py-1.5 text-base sm:text-sm"
      value={email}
      onInput={(e) => setEmail(e.currentTarget.value)}
    />
    <button class={ACCOUNT_BUTTON} type="submit" disabled={busy}>
      {ui.sendLink}
    </button>
  </div>
);

/** Email magic-link sign-in; shown only while EMAIL_SIGNIN is on. */
function EmailForm({ lang, ui, busy, run }: ViewProps) {
  const [email, setEmail] = useState('');
  const submit = (e: Event) => {
    e.preventDefault();
    void run(() => signInWithEmail(email.trim(), lang), ui.linkSent);
  };
  return (
    <form class="space-y-2" onSubmit={submit}>
      <label class="block text-sm text-muted" for="account-email">
        {ui.emailLabel}
      </label>
      <EmailRow ui={ui} busy={busy} email={email} setEmail={setEmail} />
    </form>
  );
}

const ProviderButtons = ({ lang, ui, busy, run }: ViewProps) => (
  <div class="flex flex-col gap-3">
    {options.providers.map((p) => (
      <button
        key={p}
        type="button"
        class="w-full rounded-md border border-border-strong bg-surface px-4 py-2.5 font-medium hover:border-border-hover disabled:opacity-50"
        disabled={busy}
        onClick={() => void run(() => signInWith(p, lang))}
      >
        {ui[providerLabel[p]]}
      </button>
    ))}
  </div>
);

export default function AccountSignIn(props: ViewProps & { s: SyncState; message: string }) {
  const { lang, ui, s, message } = props;
  return (
    <div class="max-w-md space-y-6">
      <div>
        <AccountHeading>{ui.signInTitle}</AccountHeading>
        <p class="text-muted">{ui.signInWhy}</p>
      </div>
      <AccountNotices s={s} ui={ui} message={message} />
      {options.email && <EmailForm {...props} />}
      {options.divider && <p class="text-xs text-subtle uppercase">{ui.or}</p>}
      <ProviderButtons {...props} />
      <PrivacyLink lang={lang} ui={ui} />
      <DownloadProgress ui={ui} />
    </div>
  );
}
