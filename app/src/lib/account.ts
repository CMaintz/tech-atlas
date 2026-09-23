/**
 * Accounts and synced progress (A44–A46) — the only module that talks to Supabase.
 *
 * Local-first: localStorage (learner.ts) stays what the UI reads and writes. When
 * signed in, this module keeps the learner's own `learner_state` row in step:
 * pull + merge on sign-in, page load, returning to the tab and coming back online;
 * push (pull + merge + upsert) shortly after each local change. Signed out,
 * offline, or with accounts unconfigured, nothing here runs and nothing breaks.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLearner, parseLearner, saveLearner } from './learner';
import { ACCOUNTS, SUPABASE_ANON_KEY, SUPABASE_URL, url, type Lang } from './site';
import { mergeLearner, sameLearner } from './sync';

export type SyncStatus = 'off' | 'signed-out' | 'syncing' | 'synced' | 'offline' | 'error';
export type SyncState = { status: SyncStatus; email?: string; at?: number };

const TABLE = 'learner_state';
const PUSH_DELAY = 1500;

let client: SupabaseClient | null = null;
let user: { id: string; email: string } | null = null;
let state: SyncState = { status: ACCOUNTS ? 'signed-out' : 'off' };
const listeners = new Set<(s: SyncState) => void>();
let started = false;
/** Set while sync itself writes localStorage, so that write doesn't schedule a push. */
let applying = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let running: Promise<void> | null = null;
let again = false;

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

async function syncOnce() {
  const c = getClient();
  const me = user;
  if (!c || !me) return;
  if (!navigator.onLine) return set({ status: 'offline' });
  set({ status: 'syncing' });
  try {
    const { data, error } = await c.from(TABLE).select('state').eq('user_id', me.id).maybeSingle();
    if (error) throw error;
    const remote = parseLearner(data?.state);
    const local = loadLearner();
    const merged = mergeLearner(local, remote);
    if (!sameLearner(merged, local)) {
      applying = true;
      try {
        saveLearner(merged);
      } finally {
        applying = false;
      }
    }
    if (!data || !sameLearner(merged, remote)) {
      const { error: upsertError } = await c
        .from(TABLE)
        .upsert({ user_id: me.id, state: merged, updated_at: new Date().toISOString() });
      if (upsertError) throw upsertError;
    }
    set({ status: 'synced', at: Date.now() });
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
  if (!user || applying) return;
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), PUSH_DELAY);
}

/** Start following auth + local changes. Safe to call from every island; runs once. */
export function startSync() {
  const c = getClient();
  if (!c || started) return;
  started = true;
  c.auth.onAuthStateChange((_event, session) => {
    const next = session?.user ? { id: session.user.id, email: session.user.email ?? '' } : null;
    const changed = next?.id !== user?.id;
    user = next;
    if (!user) {
      clearTimeout(timer);
      return set({ status: 'signed-out', email: undefined, at: undefined });
    }
    set({ email: user.email });
    // Supabase calls must not be awaited inside this callback; defer the sync.
    if (changed) setTimeout(() => void syncNow(), 0);
  });
  window.addEventListener('atlas:learner', schedulePush);
  window.addEventListener('online', () => user && void syncNow());
  document.addEventListener('visibilitychange', () => {
    if (!user) return;
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

/** Push anything pending, then sign out. Progress stays in this browser. */
export async function signOut() {
  const c = getClient();
  if (!c) return;
  await syncNow();
  await c.auth.signOut();
}

/**
 * Delete the learner's synced row, then sign out everywhere. Progress in this
 * browser is kept (it was never the server's). Throws if the delete fails, so the
 * page can say so instead of signing out as if it worked.
 */
export async function deleteSyncedData() {
  const c = getClient();
  const me = user;
  if (!c || !me) return;
  if (running) await running;
  clearTimeout(timer);
  timer = undefined;
  // Stop syncing first, so no push can recreate the row between delete and sign-out.
  user = null;
  const { error } = await c.from(TABLE).delete().eq('user_id', me.id);
  if (error) {
    user = me;
    throw error;
  }
  await c.auth.signOut({ scope: 'global' });
}
