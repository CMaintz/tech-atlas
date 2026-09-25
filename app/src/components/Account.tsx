import { useEffect, useState } from 'preact/hooks';
import {
  deleteSyncedData,
  dismissNotice,
  signInWith,
  signInWithEmail,
  signOut,
  startSync,
  startSyncingAgain,
  subscribe,
  syncNow,
  type SyncState,
} from '../lib/account';
import { EMAIL_SIGNIN, signInOptions, type AuthProvider } from '../lib/auth-config';
import { learnerExport, loadLearner } from '../lib/learner';
import { AUTH_PROVIDERS, url } from '../lib/site';

type Lang = 'en' | 'da';

interface Props {
  lang: Lang;
  ui: Record<string, string>;
}

const button =
  'rounded border border-border-strong px-3 py-1.5 text-sm hover:border-border-hover disabled:opacity-50';

/** What the signed-out view offers (A87): email only behind EMAIL_SIGNIN, providers by build variable. */
const options = signInOptions({ emailSignin: EMAIL_SIGNIN, providers: AUTH_PROVIDERS });

const providerLabel: Record<AuthProvider, string> = {
  github: 'withGitHub',
  linkedin_oidc: 'withLinkedIn',
};

/** Save this browser's progress as a JSON file (data portability, A88). */
function downloadProgress() {
  const blob = new Blob([learnerExport(loadLearner())], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `atlas-progress-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 0);
}

/** An auth error handed back in the redirect URL (e.g. an expired sign-in link). */
function redirectError(): string {
  const params = [location.search, location.hash.replace(/^#/, '?')].map(
    (q) => new URLSearchParams(q),
  );
  for (const p of params) {
    const msg = p.get('error_description') ?? p.get('error');
    if (msg) return msg;
  }
  return '';
}

/** Sign in / out, sync status, "delete my data" and "download my progress" (A44, A47, A88). */
export default function Account({ lang, ui }: Props) {
  const [s, setS] = useState<SyncState>({ status: 'loading' });
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const error = redirectError();
    if (error) setMessage(ui.authError.replace('{msg}', error));
    startSync();
    return subscribe(setS);
  }, []);

  const run = async (fn: () => Promise<string | null | void>, done = '', failed = ui.authError) => {
    setBusy(true);
    setMessage('');
    try {
      const error = await fn();
      setMessage(error ? failed.replace('{msg}', error) : done);
    } catch (e) {
      setMessage(ui.authError.replace('{msg}', e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  const feedback = (
    <>
      {s.notice === 'remoteDeleted' && (
        <p
          class="rounded border border-amber-600 p-3 text-sm text-amber-900 dark:border-amber-800 dark:text-amber-200"
          role="status"
        >
          {ui.remoteDeleted}{' '}
          <button class="underline" onClick={dismissNotice}>
            {ui.dismiss}
          </button>
        </p>
      )}
      {message && (
        <p class="text-sm text-fg-soft" role="status">
          {message}
        </p>
      )}
    </>
  );

  const privacy = (
    <p class="text-xs text-subtle">
      <a class="underline hover:text-fg-soft" href={url(`${lang}/privacy/`)}>
        {ui.privacyLink}
      </a>
    </p>
  );

  const download = (
    <div class="border-t border-border pt-6">
      <p class="mb-2 text-sm text-muted">{ui.downloadNote}</p>
      <button class={button} type="button" onClick={downloadProgress}>
        {ui.downloadProgress}
      </button>
    </div>
  );

  if (s.status === 'loading') return <p class="text-subtle">{ui.loading}</p>;

  if (s.status === 'signed-out' || s.status === 'off') {
    return (
      <div class="max-w-md space-y-6">
        {feedback}
        {options.email && (
          <form
            class="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => signInWithEmail(email.trim(), lang), ui.linkSent);
            }}
          >
            <label class="block text-sm text-muted" for="account-email">
              {ui.emailLabel}
            </label>
            <div class="flex gap-2">
              <input
                id="account-email"
                type="email"
                required
                autocomplete="email"
                class="min-w-0 flex-1 rounded border border-border-strong bg-surface px-2 py-1.5 text-sm"
                value={email}
                onInput={(e) => setEmail(e.currentTarget.value)}
              />
              <button class={button} type="submit" disabled={busy}>
                {ui.sendLink}
              </button>
            </div>
          </form>
        )}
        {options.divider && <p class="text-xs text-subtle uppercase">{ui.or}</p>}
        <div class="flex flex-wrap gap-2">
          {options.providers.map((p) => (
            <button
              key={p}
              class={button}
              disabled={busy}
              onClick={() => void run(() => signInWith(p, lang))}
            >
              {ui[providerLabel[p]]}
            </button>
          ))}
        </div>
        {privacy}
        {download}
      </div>
    );
  }

  const stopped = s.status === 'stopped';
  const statusText = stopped
    ? ui.stoppedNote
    : s.status === 'synced' && s.at
      ? ui.lastSynced.replace(
          '{time}',
          new Date(s.at).toLocaleTimeString(lang === 'da' ? 'da-DK' : 'en-GB'),
        )
      : ui[`sync_${s.status}`];
  return (
    <div class="max-w-md space-y-6">
      <div>
        <p>{ui.signedInAs.replace('{email}', s.email || '—')}</p>
        <p class="mt-1 text-sm text-muted" role="status">
          {statusText}
        </p>
        {!stopped && <p class="mt-1 text-xs text-subtle">{ui.syncAuto}</p>}
      </div>
      <div class="flex flex-wrap gap-2">
        {/* Sync runs by itself (A79); a button appears only when it needs the learner. */}
        {stopped && (
          <button class={button} disabled={busy} onClick={() => void run(startSyncingAgain)}>
            {ui.startAgain}
          </button>
        )}
        {s.status === 'error' && (
          <button class={button} disabled={busy} onClick={() => void run(syncNow)}>
            {ui.syncRetry}
          </button>
        )}
        <button class={button} disabled={busy} onClick={() => void run(signOut)}>
          {ui.signOut}
        </button>
      </div>
      {!stopped && (
        <div class="border-t border-border pt-6">
          <p class="mb-2 text-sm text-muted">{ui.deleteNote}</p>
          <button
            class={`${button} border-red-300 text-red-700 hover:border-red-600 dark:border-red-800 dark:text-red-300 dark:hover:border-red-500`}
            disabled={busy}
            onClick={() => {
              if (confirm(ui.deleteConfirm))
                void run(deleteSyncedData, ui.deleted, ui.signOutFailed);
            }}
          >
            {ui.deleteData}
          </button>
        </div>
      )}
      {download}
      {feedback}
      {privacy}
    </div>
  );
}
