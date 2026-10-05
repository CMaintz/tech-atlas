import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { syncNow, type SyncState } from '../lib/account';
import { useSyncState } from '../lib/use-sync-state';

type Ui = {
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

interface Props {
  href: string;
  ui: Ui;
}

/** A sync that finishes faster than this never shows "Syncing…" — no flicker on every change. */
const SHOW_SYNCING_AFTER = 400;

/** The status to show: follows `status`, except "syncing" only once it has lasted a moment. */
function useShownStatus(status: SyncState['status']): SyncState['status'] {
  const [shown, setShown] = useState<SyncState['status']>('loading');
  useEffect(() => {
    if (status !== 'syncing') return setShown(status);
    const t = setTimeout(() => setShown('syncing'), SHOW_SYNCING_AFTER);
    return () => clearTimeout(t);
  }, [status]);
  return shown;
}

const Synced = ({ ui }: { ui: Ui }) => (
  <span class="text-green-700 dark:text-green-500" title={ui.syncShort_synced}>
    ✓<span class="sr-only"> {ui.syncShort_synced}</span>
  </span>
);

/** "Not synced" with a "Try again" button. */
const SyncFailed = ({ ui }: { ui: Ui }) => (
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
);

const Syncing = ({ ui }: { ui: Ui }) => (
  <span class="text-xs text-subtle">{ui.syncShort_syncing}</span>
);

const Offline = ({ ui }: { ui: Ui }) => (
  <span class="text-xs text-accent" title={ui.sync_offline}>
    {ui.syncShort_offline}
  </span>
);

const Stopped = ({ ui }: { ui: Ui }) => (
  <span class="h-1.5 w-1.5 rounded-full bg-amber-500" title={ui.stoppedNote} />
);

/** The small status beside "Account", per sync status; none for the rest. */
const BADGES: Partial<Record<SyncState['status'], (p: { ui: Ui }) => JSX.Element>> = {
  synced: Synced,
  syncing: Syncing,
  offline: Offline,
  error: SyncFailed,
  stopped: Stopped,
};

/** "Account" with its sync status beside it. */
function SignedIn({ href, ui, s }: Props & { s: SyncState }) {
  const shown = useShownStatus(s.status);
  const Badge = BADGES[shown];
  return (
    <span class="inline-flex min-h-11 items-center gap-2 md:min-h-0">
      <a class="hover:text-fg" href={href} title={s.email}>
        {ui.account}
      </a>
      <span role="status" aria-live="polite" class="inline-flex items-center">
        {Badge && <Badge ui={ui} />}
      </span>
    </span>
  );
}

/**
 * Header entry to the account page. Rendered only when accounts are configured;
 * it also starts sync on every page, since any page can change progress.
 * Sync runs by itself: this shows a small status — ✓ synced, syncing…,
 * offline, or not synced with "Try again" — and nothing else to press.
 */
export default function AccountMenu({ href, ui }: Props) {
  const s = useSyncState();
  // Render nothing until the stored session is known, so "Sign in" never flashes.
  if (s.status === 'loading' || s.status === 'off') return null;
  if (s.status === 'signed-out') {
    return (
      <a class="flex min-h-11 items-center hover:text-fg md:min-h-0" href={href}>
        {ui.signIn}
      </a>
    );
  }
  return <SignedIn href={href} ui={ui} s={s} />;
}
