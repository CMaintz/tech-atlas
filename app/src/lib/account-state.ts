import { ACCOUNTS } from './site';

type SyncStatus =
  | 'off'
  | 'loading'
  | 'signed-out'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'error'
  /** Signed in after the synced data was deleted: syncing waits for "start again". */
  | 'stopped';
export type SyncNotice = 'remoteDeleted';
export type SyncState = { status: SyncStatus; email?: string; at?: number; notice?: SyncNotice };

const NOTICE_KEY = 'atlas:account:notice';

function readNotice(): SyncNotice | undefined {
  try {
    return localStorage.getItem(NOTICE_KEY) === 'remoteDeleted' ? 'remoteDeleted' : undefined;
  } catch {
    return undefined;
  }
}

let state: SyncState = { status: ACCOUNTS ? 'loading' : 'off', notice: readNotice() };
const listeners = new Set<(s: SyncState) => void>();

export const syncState = (): SyncState => state;

export function setSyncState(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  for (const fn of listeners) fn(state);
}

export function subscribe(fn: (s: SyncState) => void): () => void {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

function storeNotice(notice: SyncNotice | undefined) {
  try {
    if (notice) localStorage.setItem(NOTICE_KEY, notice);
    else localStorage.removeItem(NOTICE_KEY);
  } catch {
    return;
  }
}

export function writeNotice(notice: SyncNotice | undefined) {
  storeNotice(notice);
  setSyncState({ notice });
}

export const dismissNotice = () => writeNotice(undefined);
