/** Pieces both account views (signed in and signed out) show. */
import type { ComponentChildren } from 'preact';
import { dismissNotice, type SyncState } from '../lib/account';
import { learnerExport, loadLearner } from '../lib/learner';
import { url, type Lang } from '../lib/site';
import type { Run } from '../lib/use-account-action';

export type AccountUi = Record<string, string>;

/** What each view needs: its strings, and the one-at-a-time action runner. */
export type ViewProps = { lang: Lang; ui: AccountUi; busy: boolean; run: Run };

export const ACCOUNT_BUTTON =
  'min-h-11 rounded border border-border-strong px-3 py-1.5 text-sm hover:border-border-hover disabled:opacity-50 sm:min-h-0';

/** Save this browser's progress as a JSON file (data portability, A88). */
function downloadProgress() {
  const blob = new Blob([learnerExport(loadLearner())], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `atlas-progress-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 0);
}

export const AccountHeading = ({ children }: { children: ComponentChildren }) => (
  <h1 class="mb-2 text-3xl font-semibold">{children}</h1>
);

/** "Your synced data was deleted elsewhere", with a button to dismiss it. */
const RemoteDeleted = ({ ui }: { ui: AccountUi }) => (
  <p
    class="rounded border border-amber-600 p-3 text-sm text-amber-900 dark:border-amber-800 dark:text-amber-200"
    role="status"
  >
    {ui.remoteDeleted}{' '}
    <button class="underline" onClick={dismissNotice}>
      {ui.dismiss}
    </button>
  </p>
);

type NoticesProps = { s: SyncState; ui: AccountUi; message: string };

/** The remote-deletion notice (if any) and how the last action went. */
export const AccountNotices = ({ s, ui, message }: NoticesProps) => (
  <>
    {s.notice === 'remoteDeleted' && <RemoteDeleted ui={ui} />}
    {message && (
      <p class="text-sm text-fg-soft" role="status">
        {message}
      </p>
    )}
  </>
);

export const PrivacyLink = ({ lang, ui }: { lang: Lang; ui: AccountUi }) => (
  <p class="text-xs text-subtle">
    <a class="underline hover:text-fg-soft" href={url(`${lang}/privacy/`)}>
      {ui.privacyLink}
    </a>
  </p>
);

export const DownloadProgress = ({ ui }: { ui: AccountUi }) => (
  <div class="border-t border-border pt-6">
    <p class="mb-2 text-sm text-muted">{ui.downloadNote}</p>
    <button class={ACCOUNT_BUTTON} type="button" onClick={downloadProgress}>
      {ui.downloadProgress}
    </button>
  </div>
);
