import { useEffect, useState } from 'preact/hooks';
import { startSync, subscribe, type SyncState } from './account';

export function useSyncState(): SyncState {
  const [s, setS] = useState<SyncState>({ status: 'loading' });
  useEffect(() => {
    startSync();
    return subscribe(setS);
  }, []);
  return s;
}
