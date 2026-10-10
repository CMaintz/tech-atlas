import { useState } from 'preact/hooks';
import type { SyncState } from '../lib/account';
import { signInWith, signInWithEmail } from '../lib/account-auth';
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

const signInChoices = signInOptions({ emailSignin: EMAIL_SIGNIN, providers: AUTH_PROVIDERS });

const providerLabel: Record<AuthProvider, string> = {
  github: 'withGitHub',
  linkedin_oidc: 'withLinkedIn',
};

type EmailRowProps = Pick<ViewProps, 'ui' | 'busy'> & {
  email: string;
  setEmail: (email: string) => void;
};

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
    {signInChoices.providers.map((p) => (
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
      {signInChoices.email && <EmailForm {...props} />}
      {signInChoices.divider && <p class="text-xs text-subtle uppercase">{ui.or}</p>}
      <ProviderButtons {...props} />
      <PrivacyLink lang={lang} ui={ui} />
      <DownloadProgress ui={ui} />
    </div>
  );
}
