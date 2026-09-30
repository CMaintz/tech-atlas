import {
  deleteSyncedData,
  signOut,
  startSyncingAgain,
  syncNow,
  type SyncState,
} from '../lib/account';
import { syncStatusText } from '../lib/account-view';
import type { Lang } from '../lib/site';
import { useAccountAction } from '../lib/use-account-action';
import { useSyncState } from '../lib/use-sync-state';
import {
  ACCOUNT_BUTTON,
  AccountHeading,
  AccountNotices,
  DownloadProgress,
  PrivacyLink,
  type AccountUi,
  type ViewProps,
} from './AccountShared';
import AccountSignIn from './AccountSignIn';

interface Props {
  lang: Lang;
  ui: AccountUi;
}

type SignedInProps = ViewProps & { s: SyncState };

/** Who is signed in and how sync stands. */
const SyncSummary = ({ s, ui, lang }: SignedInProps) => (
  <div>
    <AccountHeading>{ui.account}</AccountHeading>
    <p>{ui.signedInAs.replace('{email}', s.email || '-')}</p>
    <p class="mt-1 text-sm text-muted" role="status">
      {syncStatusText(s, ui, lang)}
    </p>
    {s.status !== 'stopped' && <p class="mt-1 text-xs text-subtle">{ui.syncAuto}</p>}
  </div>
);

/** Sync runs by itself (A79); a button appears only when it needs the learner. */
const SyncActions = ({ s, ui, busy, run }: SignedInProps) => (
  <div class="flex flex-wrap gap-2">
    {s.status === 'stopped' && (
      <button class={ACCOUNT_BUTTON} disabled={busy} onClick={() => void run(startSyncingAgain)}>
        {ui.startAgain}
      </button>
    )}
    {s.status === 'error' && (
      <button class={ACCOUNT_BUTTON} disabled={busy} onClick={() => void run(syncNow)}>
        {ui.syncRetry}
      </button>
    )}
    <button class={ACCOUNT_BUTTON} disabled={busy} onClick={() => void run(signOut)}>
      {ui.signOut}
    </button>
  </div>
);

/** "Delete my synced data" (A47), after a confirm. */
function DeleteData({ ui, busy, run }: ViewProps) {
  const onClick = () => {
    if (confirm(ui.deleteConfirm)) void run(deleteSyncedData, ui.deleted, ui.signOutFailed);
  };
  return (
    <div class="border-t border-border pt-6">
      <p class="mb-2 text-sm text-muted">{ui.deleteNote}</p>
      <button
        class={`${ACCOUNT_BUTTON} border-red-300 text-red-700 hover:border-red-600 dark:border-red-800 dark:text-red-300 dark:hover:border-red-500`}
        disabled={busy}
        onClick={onClick}
      >
        {ui.deleteData}
      </button>
    </div>
  );
}

function AccountSignedIn(props: SignedInProps & { message: string }) {
  const { lang, ui, s, message } = props;
  return (
    <div class="max-w-md space-y-6">
      <SyncSummary {...props} />
      <SyncActions {...props} />
      {s.status !== 'stopped' && <DeleteData {...props} />}
      <DownloadProgress ui={ui} />
      <AccountNotices s={s} ui={ui} message={message} />
      <PrivacyLink lang={lang} ui={ui} />
    </div>
  );
}

/** Sign in / out, sync status, "delete my data" and "download my progress" (A44, A47, A88). */
export default function Account({ lang, ui }: Props) {
  const s = useSyncState();
  const { busy, message, run } = useAccountAction(ui.authError);
  const view = { lang, ui, s, busy, run, message };

  if (s.status === 'loading') return <p class="text-subtle">{ui.loading}</p>;
  if (s.status === 'signed-out' || s.status === 'off') return <AccountSignIn {...view} />;
  return <AccountSignedIn {...view} />;
}
