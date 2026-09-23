import { useEffect, useState } from 'preact/hooks';
import { startSync, subscribe, type SyncState } from '../lib/account';

interface Props {
  href: string;
  ui: { signIn: string; account: string; sync_error: string; sync_offline: string };
}

const DOT: Partial<Record<SyncState['status'], string>> = {
  syncing: 'bg-neutral-400',
  synced: 'bg-green-500',
  offline: 'bg-amber-500',
  stopped: 'bg-amber-500',
  error: 'bg-red-500',
};

/**
 * Header entry to the account page. Rendered only when accounts are configured
 * (A44); it also starts sync on every page, since any page can change progress.
 */
export default function AccountMenu({ href, ui }: Props) {
  const [s, setS] = useState<SyncState>({ status: 'loading' });
  useEffect(() => {
    startSync();
    return subscribe(setS);
  }, []);

  // Render nothing until the stored session is known, so "Sign in" never flashes.
  if (s.status === 'loading' || s.status === 'off') return null;
  const signedIn = s.status !== 'signed-out';
  const title =
    s.status === 'error' ? ui.sync_error : s.status === 'offline' ? ui.sync_offline : s.email;
  return (
    <a class="inline-flex items-center gap-1.5 hover:text-neutral-100" href={href} title={title}>
      {signedIn && <span class={`h-1.5 w-1.5 rounded-full ${DOT[s.status] ?? ''}`} />}
      {signedIn ? ui.account : ui.signIn}
    </a>
  );
}
