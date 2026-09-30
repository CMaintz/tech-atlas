import { useEffect, useState } from 'preact/hooks';
import { startSync, subscribe, type SyncState } from './account';

/** Follow the account's sync state, starting sync (once per page) on mount. */
export function useSyncState(): SyncState {
  const [s, setS] = useState<SyncState>({ status: 'loading' });
  useEffect(() => {
    startSync();
    return subscribe(setS);
  }, []);
  return s;
}
