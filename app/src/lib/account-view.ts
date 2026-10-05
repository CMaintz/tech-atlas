/** The account page's text that depends on where the learner is. Pure. */
import type { SyncState } from './account-state';
import type { Lang } from './site';

/**
 * An auth error handed back in the redirect URL (e.g. an expired sign-in link), from
 * the query or the hash fragment; '' when there is none.
 */
export function redirectError(search: string, hash: string): string {
  const params = [search, hash.replace(/^#/, '?')].map((q) => new URLSearchParams(q));
  for (const p of params) {
    const msg = p.get('error_description') ?? p.get('error');
    if (msg) return msg;
  }
  return '';
}

/** The one-line sync status under "Signed in as …". */
export function syncStatusText(s: SyncState, ui: Record<string, string>, lang: Lang): string {
  if (s.status === 'stopped') return ui.stoppedNote;
  if (s.status === 'synced' && s.at) {
    const time = new Date(s.at).toLocaleTimeString(lang === 'da' ? 'da-DK' : 'en-GB');
    return ui.lastSynced.replace('{time}', time);
  }
  return ui[`sync_${s.status}`];
}
