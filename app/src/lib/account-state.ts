/**
 * The sync state the account UI follows: one value, its listeners, and the
 * "you were signed out because your data was deleted" notice that outlives a reload.
 * account.ts is the only writer; islands read it through `subscribe`.
 */
import { ACCOUNTS } from './site';

export type SyncStatus =
  | 'off'
  | 'loading'
  | 'signed-out'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'error'
  /** Signed in after the synced data was deleted: syncing waits for "start again". */
  | 'stopped';
/** 'remoteDeleted': this browser was signed out because the data was deleted elsewhere. */
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

/** The current sync state. */
export const syncState = (): SyncState => state;

export function setSyncState(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  for (const fn of listeners) fn(state);
}

/** Follow the sync state; returns an unsubscribe function. */
export function subscribe(fn: (s: SyncState) => void): () => void {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

/** Show (and remember) a notice, or clear it with `undefined`. */
export function writeNotice(notice: SyncNotice | undefined) {
  try {
    if (notice) localStorage.setItem(NOTICE_KEY, notice);
    else localStorage.removeItem(NOTICE_KEY);
  } catch {
    // Storage blocked: the notice lasts only for this page.
  }
  setSyncState({ notice });
}

export const dismissNotice = () => writeNotice(undefined);
