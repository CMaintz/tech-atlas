/**
 * Accounts and synced progress (A44–A49) — the only module that talks to Supabase.
 *
 * Local-first: localStorage (learner.ts) stays what the UI reads and writes. When
 * signed in, this module keeps the learner's own `learner_state` row in step:
 * pull + merge on sign-in, page load, returning to the tab and coming back online;
 * push (pull + merge + versioned write) shortly after each local change. Signed
 * out, offline, or with accounts unconfigured, nothing here runs and nothing breaks.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLearner, parseLearner, saveLearner, type Learner } from './learner';
import { ACCOUNTS, SUPABASE_ANON_KEY, SUPABASE_URL, url, type Lang } from './site';
import { mergeLearner, sameLearner } from './sync';

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

type Row = { state: unknown; version: number; deleted_at: string | null };
type Me = { id: string; email: string; signedInAt: number };

const TABLE = 'learner_state';
const PUSH_DELAY = 1500;
const ATTEMPTS = 4;
const NOTICE_KEY = 'atlas:account:notice';

let client: SupabaseClient | null = null;
let user: Me | null = null;
let state: SyncState = { status: ACCOUNTS ? 'loading' : 'off', notice: readNotice() };
const listeners = new Set<(s: SyncState) => void>();
let started = false;
/** Set while sync itself writes localStorage, so that write doesn't schedule a push. */
let applying = false;
/** Set while "delete my data" runs, so no auth event or change can sync meanwhile. */
let deleting = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let running: Promise<void> | null = null;
let again = false;

function readNotice(): SyncNotice | undefined {
  try {
    return localStorage.getItem(NOTICE_KEY) === 'remoteDeleted' ? 'remoteDeleted' : undefined;
  } catch {
    return undefined;
  }
}

function writeNotice(notice: SyncNotice | undefined) {
  try {
    if (notice) localStorage.setItem(NOTICE_KEY, notice);
    else localStorage.removeItem(NOTICE_KEY);
  } catch {
    // Storage blocked: the notice lasts only for this page.
  }
  set({ notice });
}

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

function set(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  for (const fn of listeners) fn(state);
}

/** Follow the sync state; returns an unsubscribe function. */
export function subscribe(fn: (s: SyncState) => void): () => void {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
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
  if (me.signedInAt > Date.parse(row.deleted_at ?? '')) return set({ status: 'stopped' });
  writeNotice('remoteDeleted');
  await c.auth.signOut({ scope: 'local' });
}

/**
 * Write `merged` over the version we read, or insert when there was no row. Returns
 * false when someone else wrote first (0 rows changed / duplicate insert), so the
 * caller re-pulls, re-merges and tries again (A49).
 */
async function write(
  c: SupabaseClient,
  me: Me,
  row: Row | null,
  patch: Record<string, unknown>,
): Promise<boolean> {
  if (!row) {
    const { error } = await c.from(TABLE).insert({ user_id: me.id, ...patch });
    if (error?.code === '23505') return false;
    if (error) throw error;
    return true;
  }
  const { data, error } = await c
    .from(TABLE)
    .update(patch)
    .eq('user_id', me.id)
    .eq('version', row.version)
    .select('version');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

async function pull(c: SupabaseClient, me: Me): Promise<Row | null> {
  const { data, error } = await c
    .from(TABLE)
    .select('state, version, deleted_at')
    .eq('user_id', me.id)
    .maybeSingle();
  if (error) throw error;
  return data as Row | null;
}

async function syncOnce() {
  const c = getClient();
  const me = user;
  if (!c || !me || deleting) return;
  if (!navigator.onLine) return set({ status: 'offline' });
  set({ status: 'syncing' });
  try {
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const row = await pull(c, me);
      if (deleting || user?.id !== me.id) return;
      if (row?.deleted_at) return await onTombstone(c, me, row);
      const remote = parseLearner(row?.state);
      const local = loadLearner();
      const merged = mergeLearner(local, remote);
      if (!sameLearner(merged, local)) applyLocally(merged);
      if (row && sameLearner(merged, remote)) return set({ status: 'synced', at: Date.now() });
      if (await write(c, me, row, { state: merged }))
        return set({ status: 'synced', at: Date.now() });
    }
    throw new Error('Sync kept conflicting with another device.');
  } catch {
    // Progress is safe locally either way; the next change or visit retries.
    set({ status: navigator.onLine ? 'error' : 'offline' });
  }
}

/** Pull, merge and push now. Calls made while one is running coalesce into one more pass. */
export function syncNow(): Promise<void> {
  clearTimeout(timer);
  timer = undefined;
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await syncOnce();
    } while (again);
  })().finally(() => (running = null));
  return running;
}

function schedulePush() {
  if (!user || applying || deleting || state.status === 'stopped') return;
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
      return set({ status: 'signed-out', email: undefined, at: undefined });
    }
    if (event === 'SIGNED_IN' && state.notice) writeNotice(undefined);
    set({ email: user.email, ...(state.status === 'loading' ? { status: 'syncing' } : {}) });
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

export async function signInWithEmail(email: string, lang: Lang): Promise<string | null> {
  const c = getClient();
  if (!c) return 'Accounts are not configured.';
  const { error } = await c.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: returnUrl(lang), shouldCreateUser: true },
  });
  return error?.message ?? null;
}

export async function signInWithGitHub(lang: Lang): Promise<string | null> {
  const c = getClient();
  if (!c) return 'Accounts are not configured.';
  const { error } = await c.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: returnUrl(lang) },
  });
  return error?.message ?? null;
}

/** Push anything pending, then sign out of this browser. Progress stays here. */
export async function signOut(): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  if (state.status !== 'stopped') await syncNow();
  const { error } = await c.auth.signOut({ scope: 'local' });
  return error?.message ?? null;
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
    clearTimeout(timer);
    timer = undefined;
    if (running) await running;
    const { error } = await c
      .from(TABLE)
      .upsert({ user_id: me.id, state: {}, deleted_at: new Date().toISOString() });
    if (error) throw error;
    const { error: outError } = await c.auth.signOut({ scope: 'global' });
    if (!outError) return null;
    // Data is gone either way; at least leave this browser signed out.
    await c.auth.signOut({ scope: 'local' });
    return outError.message;
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
      set({ status: 'syncing' });
      await syncNow();
      return null;
    }
  }
  return 'Sync kept conflicting with another device.';
}

export const dismissNotice = () => writeNotice(undefined);
