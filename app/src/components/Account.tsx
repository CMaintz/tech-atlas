import { useEffect, useState } from 'preact/hooks';
import {
  deleteSyncedData,
  dismissNotice,
  signInWithEmail,
  signInWithGitHub,
  signOut,
  startSync,
  startSyncingAgain,
  subscribe,
  syncNow,
  type SyncState,
} from '../lib/account';

type Lang = 'en' | 'da';

interface Props {
  lang: Lang;
  ui: Record<string, string>;
}

const button =
  'rounded border border-neutral-700 px-3 py-1.5 text-sm hover:border-neutral-400 disabled:opacity-50';

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

/** Sign in / out, sync status and "delete my data" (A44, A47). */
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
        <p class="rounded border border-amber-800 p-3 text-sm text-amber-200" role="status">
          {ui.remoteDeleted}{' '}
          <button class="underline" onClick={dismissNotice}>
            {ui.dismiss}
          </button>
        </p>
      )}
      {message && (
        <p class="text-sm text-neutral-300" role="status">
          {message}
        </p>
      )}
    </>
  );

  if (s.status === 'loading') return <p class="text-neutral-500">{ui.loading}</p>;

  if (s.status === 'signed-out' || s.status === 'off') {
    return (
      <div class="max-w-md space-y-6">
        {feedback}
        <form
          class="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => signInWithEmail(email.trim(), lang), ui.linkSent);
          }}
        >
          <label class="block text-sm text-neutral-400" for="account-email">
            {ui.emailLabel}
          </label>
          <div class="flex gap-2">
            <input
              id="account-email"
              type="email"
              required
              autocomplete="email"
              class="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm"
              value={email}
              onInput={(e) => setEmail(e.currentTarget.value)}
            />
            <button class={button} type="submit" disabled={busy}>
              {ui.sendLink}
            </button>
          </div>
        </form>
        <p class="text-xs text-neutral-500 uppercase">{ui.or}</p>
        <button
          class={button}
          disabled={busy}
          onClick={() => void run(() => signInWithGitHub(lang))}
        >
          {ui.withGitHub}
        </button>
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
        <p class="mt-1 text-sm text-neutral-400" role="status">
          {statusText}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        {stopped ? (
          <button class={button} disabled={busy} onClick={() => void run(startSyncingAgain)}>
            {ui.startAgain}
          </button>
        ) : (
          <button class={button} disabled={busy} onClick={() => void run(syncNow)}>
            {ui.syncNow}
          </button>
        )}
        <button class={button} disabled={busy} onClick={() => void run(signOut)}>
          {ui.signOut}
        </button>
      </div>
      {!stopped && (
        <div class="border-t border-neutral-800 pt-6">
          <p class="mb-2 text-sm text-neutral-400">{ui.deleteNote}</p>
          <button
            class={`${button} border-red-800 text-red-300 hover:border-red-500`}
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
      {feedback}
    </div>
  );
}
