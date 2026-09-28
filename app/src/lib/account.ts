/**
 * Accounts and synced progress (A44–A49) — the only module that talks to Supabase.
 *
 * Local-first: localStorage (learner.ts) stays what the UI reads and writes. When
 * signed in, this module keeps the learner's own `learner_state` row in step:
 * pull + merge on sign-in, page load, returning to the tab and coming back online;
 * push (pull + merge + versioned write) shortly after each local change. Signed
 * out, offline, or with accounts unconfigured, nothing here runs and nothing breaks.
 * The row reads/writes live in account-rows.ts, the observable state in account-state.ts.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { pull, write, writeTombstone, type Me, type Row } from './account-rows';
import { setSyncState, syncState, writeNotice } from './account-state';
import type { AuthProvider } from './auth-config';
import { loadLearner, parseLearner, saveLearner, type Learner } from './learner';
import { ACCOUNTS, SUPABASE_ANON_KEY, SUPABASE_URL, url, type Lang } from './site';
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
/** After a failed sync, try again by itself after these delays (the last one repeats). */
const RETRY_DELAYS = [5_000, 15_000, 60_000, 300_000];
const CONFLICTING = 'Sync kept conflicting with another device.';

let client: SupabaseClient | null = null;
let user: Me | null = null;
let started = false;
/** Set while sync itself writes localStorage, so that write doesn't schedule a push. */
let applying = false;
/** Set while "delete my data" runs, so no auth event or change can sync meanwhile. */
let deleting = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let running: Promise<void> | null = null;
let again = false;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let failures = 0;

function getClient(): SupabaseClient | null {
  if (!ACCOUNTS) return null;
  // PKCE (A46): the sign-in link or GitHub redirect returns a one-time code that
  // only this browser can exchange; detectSessionInUrl completes it on load.
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

function applyLocally(merged: Learner) {
  applying = true;
  try {
    saveLearner(merged);
  } finally {
    applying = false;
  }
}

/**
 * The row is a tombstone (A47). A session that predates the deletion belongs to a
 * device that should stop: sign it out here with a notice. A session started after
 * it is the learner coming back: keep them signed in, but write nothing until they
 * choose "start syncing again".
 */
async function onTombstone(c: SupabaseClient, me: Me, row: Row) {
  if (me.signedInAt > Date.parse(row.deleted_at ?? '')) return setSyncState({ status: 'stopped' });
  writeNotice('remoteDeleted');
  await c.auth.signOut({ scope: 'local' });
}

/** Merge the synced copy into this browser's progress, saving it here if it changed. */
function mergeIntoLocal(remote: Learner): Learner {
  const local = loadLearner();
  const merged = mergeLearner(local, remote);
  if (!sameLearner(merged, local)) applyLocally(merged);
  return merged;
}

/**
 * One pull, merge and write. True when this sync is finished (synced, tombstoned, or
 * no longer wanted); false when another device wrote first and it must go again.
 */
async function syncPass(c: SupabaseClient, me: Me): Promise<boolean> {
  const row = await pull(c, me);
  if (deleting || user?.id !== me.id) return true;
  if (row?.deleted_at) {
    await onTombstone(c, me, row);
    return true;
  }
  const remote = parseLearner(row?.state);
  const merged = mergeIntoLocal(remote);
  if ((row && sameLearner(merged, remote)) || (await write(c, me, row, { state: merged }))) {
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
    // Progress is safe locally either way; the next change or visit retries.
    setSyncState({ status: navigator.onLine ? 'error' : 'offline' });
  }
}

/**
 * A failed sync retries by itself with a growing delay, so a passing network or
 * server hiccup heals without the learner doing anything; success resets it.
 */
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

/**
 * Pull, merge and push now. Runs by itself (A44); called directly only by "Try
 * again" after an error. Calls made while one is running coalesce into one more pass.
 */
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

/** Start following auth + local changes. Safe to call from every island; runs once. */
export function startSync() {
  const c = getClient();
  if (!c || started) return;
  started = true;
  c.auth.onAuthStateChange((event, session) => {
    const u = session?.user;
    const next: Me | null = u
      ? { id: u.id, email: u.email ?? '', signedInAt: Date.parse(u.last_sign_in_at ?? '') || 0 }
      : null;
    const changed = next?.id !== user?.id;
    user = next;
    if (!user) {
      clearTimeout(timer);
      clearTimeout(retryTimer);
      failures = 0;
      return setSyncState({ status: 'signed-out', email: undefined, at: undefined });
    }
    if (event === 'SIGNED_IN' && syncState().notice) writeNotice(undefined);
    const s = syncState();
    setSyncState({ email: user.email, ...(s.status === 'loading' ? { status: 'syncing' } : {}) });
    // Supabase calls must not be awaited inside this callback; defer the sync.
    if (changed && !deleting) setTimeout(() => void syncNow(), 0);
  });
  window.addEventListener('atlas:learner', schedulePush);
  window.addEventListener('online', () => user && void syncNow());
  document.addEventListener('visibilitychange', () => {
    if (!user || deleting) return;
    // Leaving: flush a pending push. Returning: pick up changes from other devices.
    if (document.visibilityState === 'visible' || timer !== undefined) void syncNow();
  });
}

/** Absolute URL of the account page — where sign-in links and OAuth return to. */
const returnUrl = (lang: Lang) => new URL(url(`${lang}/account/`), location.origin).href;

/** Email magic link — offered only while `EMAIL_SIGNIN` (auth-config.ts) is on. */
export async function signInWithEmail(email: string, lang: Lang): Promise<string | null> {
  const c = getClient();
  if (!c) return 'Accounts are not configured.';
  const { error } = await c.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: returnUrl(lang), shouldCreateUser: true },
  });
  return error?.message ?? null;
}

/** Sign in with an OAuth provider (A46, A87): a PKCE redirect back to the account page. */
export async function signInWith(provider: AuthProvider, lang: Lang): Promise<string | null> {
  const c = getClient();
  if (!c) return 'Accounts are not configured.';
  const { error } = await c.auth.signInWithOAuth({
    provider,
    options: { redirectTo: returnUrl(lang) },
  });
  return error?.message ?? null;
}

/** Push anything pending, then sign out of this browser. Progress stays here. */
export async function signOut(): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  if (syncState().status !== 'stopped') await syncNow();
  const { error } = await c.auth.signOut({ scope: 'local' });
  return error?.message ?? null;
}

/** Drop a scheduled push and wait for a sync already under way. */
async function settleSync() {
  clearTimeout(timer);
  timer = undefined;
  if (running) await running;
}

/** Sign out every session; if that fails, at least this browser. Returns the error, if any. */
async function signOutEverywhere(c: SupabaseClient): Promise<string | null> {
  const { error } = await c.auth.signOut({ scope: 'global' });
  if (!error) return null;
  // Data is gone either way; at least leave this browser signed out.
  await c.auth.signOut({ scope: 'local' });
  return error.message;
}

/**
 * "Delete my synced data" (A47): replace the row with a tombstone (empty state,
 * `deleted_at` set), then sign out every session. Other devices signed in before
 * this find the tombstone on their next sync and sign themselves out — they cannot
 * write progress back. Progress in this browser is kept (it was never the server's).
 * Throws if the tombstone can't be written; returns a message if sign-out failed.
 */
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

/** After a delete: reopen the row with this browser's progress and resume syncing. */
export async function startSyncingAgain(): Promise<string | null> {
  const c = getClient();
  const me = user;
  if (!c || !me) return null;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const row = await pull(c, me);
    const patch = { state: loadLearner(), deleted_at: null };
    if (await write(c, me, row, patch)) {
      setSyncState({ status: 'syncing' });
      await syncNow();
      return null;
    }
  }
  return CONFLICTING;
}
