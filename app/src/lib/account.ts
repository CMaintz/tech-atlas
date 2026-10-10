import type { AuthChangeEvent, SupabaseClient } from '@supabase/supabase-js';
import { getClient, signOutEverywhere } from './account-auth';
import { meOf, pull, write, writeTombstone, type Me, type Row } from './account-rows';
import { setSyncState, syncState, writeNotice } from './account-state';
import { loadLearner, parseLearner, saveLearner, type Learner } from './learner';
import { mergeLearner, sameLearner } from './sync';

export {
  dismissNotice,
  subscribe,
  type SyncNotice,
  type SyncState,
  type SyncStatus,
} from './account-state';

const PUSH_DELAY = 1500;
const ATTEMPTS = 4;
const RETRY_DELAYS = [5_000, 15_000, 60_000, 300_000];
const CONFLICTING = 'Sync kept conflicting with another device.';

let user: Me | null = null;
let started = false;
let applying = false;
let deleting = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let running: Promise<void> | null = null;
let again = false;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let failures = 0;

function applyLocally(merged: Learner) {
  applying = true;
  try {
    saveLearner(merged);
  } finally {
    applying = false;
  }
}

async function onTombstone(c: SupabaseClient, me: Me, row: Row) {
  if (me.signedInAt > Date.parse(row.deleted_at ?? '')) return setSyncState({ status: 'stopped' });
  writeNotice('remoteDeleted');
  await c.auth.signOut({ scope: 'local' });
}

function mergeIntoLocal(remote: Learner): Learner {
  const local = loadLearner();
  const merged = mergeLearner(local, remote);
  if (!sameLearner(merged, local)) applyLocally(merged);
  return merged;
}

async function syncPass(c: SupabaseClient, me: Me): Promise<boolean> {
  const row = await pull(c, me);
  if (deleting || user?.id !== me.id) return true;
  if (row?.deleted_at) {
    await onTombstone(c, me, row);
    return true;
  }
  const remote = parseLearner(row?.state);
  const merged = mergeIntoLocal(remote);
  if (
    (row && sameLearner(merged, remote)) ||
    (await write(c, me, { read: row, patch: { state: merged } }))
  ) {
    setSyncState({ status: 'synced', at: Date.now() });
    return true;
  }
  return false;
}

async function syncOnce() {
  const c = getClient();
  const me = user;
  if (!c || !me || deleting) return;
  if (!navigator.onLine) return setSyncState({ status: 'offline' });
  setSyncState({ status: 'syncing' });
  try {
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) if (await syncPass(c, me)) return;
    throw new Error(CONFLICTING);
  } catch {
    setSyncState({ status: navigator.onLine ? 'error' : 'offline' });
  }
}

function afterSync() {
  clearTimeout(retryTimer);
  retryTimer = undefined;
  if (syncState().status !== 'error') {
    failures = 0;
    return;
  }
  const delay = RETRY_DELAYS[Math.min(failures, RETRY_DELAYS.length - 1)];
  failures++;
  retryTimer = setTimeout(() => user && void syncNow(), delay);
}

export function syncNow(): Promise<void> {
  clearTimeout(timer);
  timer = undefined;
  clearTimeout(retryTimer);
  retryTimer = undefined;
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await syncOnce();
    } while (again);
    afterSync();
  })().finally(() => (running = null));
  return running;
}

function schedulePush() {
  if (!user || applying || deleting || syncState().status === 'stopped') return;
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), PUSH_DELAY);
}

function onSignedOut() {
  clearTimeout(timer);
  clearTimeout(retryTimer);
  failures = 0;
  setSyncState({ status: 'signed-out', email: undefined, at: undefined });
}

function onSignedIn(me: Me, event: AuthChangeEvent, changed: boolean) {
  if (event === 'SIGNED_IN' && syncState().notice) writeNotice(undefined);
  const s = syncState();
  setSyncState({ email: me.email, ...(s.status === 'loading' ? { status: 'syncing' } : {}) });
  if (changed && !deleting) setTimeout(() => void syncNow(), 0);
}

export function startSync() {
  const c = getClient();
  if (!c || started) return;
  started = true;
  c.auth.onAuthStateChange((event, session) => {
    const next = meOf(session?.user);
    const changed = next?.id !== user?.id;
    user = next;
    if (next) onSignedIn(next, event, changed);
    else onSignedOut();
  });
  window.addEventListener('atlas:learner', schedulePush);
  window.addEventListener('online', () => user && void syncNow());
  document.addEventListener('visibilitychange', () => {
    if (!user || deleting) return;
    if (document.visibilityState === 'visible' || timer !== undefined) void syncNow();
  });
}

export async function signOut(): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  if (syncState().status !== 'stopped') await syncNow();
  const { error } = await c.auth.signOut({ scope: 'local' });
  return error?.message ?? null;
}

async function settleSync() {
  clearTimeout(timer);
  timer = undefined;
  if (running) await running;
}

export async function deleteSyncedData(): Promise<string | null> {
  const c = getClient();
  const me = user;
  if (!c || !me) return null;
  deleting = true;
  try {
    await settleSync();
    await writeTombstone(c, me);
    return await signOutEverywhere(c);
  } finally {
    deleting = false;
  }
}

export async function startSyncingAgain(): Promise<string | null> {
  const c = getClient();
  const me = user;
  if (!c || !me) return null;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const row = await pull(c, me);
    const patch = { state: loadLearner(), deleted_at: null };
    if (await write(c, me, { read: row, patch })) {
      setSyncState({ status: 'syncing' });
      await syncNow();
      return null;
    }
  }
  return CONFLICTING;
}
