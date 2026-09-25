import { useEffect, useState } from 'preact/hooks';
import { startSync, subscribe, syncNow, type SyncState } from '../lib/account';

interface Props {
  href: string;
  ui: {
    signIn: string;
    account: string;
    sync_error: string;
    sync_offline: string;
    syncRetry: string;
    syncShort_syncing: string;
    syncShort_synced: string;
    syncShort_offline: string;
    syncShort_error: string;
    stoppedNote: string;
  };
}

/** A sync that finishes faster than this never shows "Syncing…" — no flicker on every change. */
const SHOW_SYNCING_AFTER = 400;

/**
 * Header entry to the account page. Rendered only when accounts are configured
 * (A44); it also starts sync on every page, since any page can change progress.
 * Sync runs by itself (A79): this shows a small status — ✓ synced, syncing…,
 * offline, or not synced with "Try again" — and nothing else to press.
 */
export default function AccountMenu({ href, ui }: Props) {
  const [s, setS] = useState<SyncState>({ status: 'loading' });
  const [shown, setShown] = useState<SyncState['status']>('loading');
  useEffect(() => {
    startSync();
    return subscribe(setS);
  }, []);
  useEffect(() => {
    if (s.status !== 'syncing') return setShown(s.status);
    const t = setTimeout(() => setShown('syncing'), SHOW_SYNCING_AFTER);
    return () => clearTimeout(t);
  }, [s.status]);

  // Render nothing until the stored session is known, so "Sign in" never flashes.
  if (s.status === 'loading' || s.status === 'off') return null;
  if (s.status === 'signed-out') {
    return (
      <a class="py-1.5 hover:text-fg md:py-0" href={href}>
        {ui.signIn}
      </a>
    );
  }

  const status =
    shown === 'synced' ? (
      <span class="text-green-700 dark:text-green-500" title={ui.syncShort_synced}>
        ✓<span class="sr-only"> {ui.syncShort_synced}</span>
      </span>
    ) : shown === 'syncing' ? (
      <span class="text-xs text-subtle">{ui.syncShort_syncing}</span>
    ) : shown === 'offline' ? (
      <span class="text-xs text-accent" title={ui.sync_offline}>
        {ui.syncShort_offline}
      </span>
    ) : shown === 'error' ? (
      <span
        class="inline-flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400"
        title={ui.sync_error}
      >
        {ui.syncShort_error}
        <button
          type="button"
          class="underline hover:text-red-900 dark:hover:text-red-300"
          onClick={() => void syncNow()}
        >
          {ui.syncRetry}
        </button>
      </span>
    ) : shown === 'stopped' ? (
      <span class="h-1.5 w-1.5 rounded-full bg-amber-500" title={ui.stoppedNote} />
    ) : null;

  return (
    <span class="inline-flex items-center gap-2 py-1.5 md:py-0">
      <a class="hover:text-fg" href={href} title={s.email}>
        {ui.account}
      </a>
      <span role="status" aria-live="polite" class="inline-flex items-center">
        {status}
      </span>
    </span>
  );
}
