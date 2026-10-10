import type { SyncState } from './account-state';
import type { Lang } from './site';

export function redirectError(search: string, hash: string): string {
  const params = [search, hash.replace(/^#/, '?')].map((q) => new URLSearchParams(q));
  for (const p of params) {
    const msg = p.get('error_description') ?? p.get('error');
    if (msg) return msg;
  }
  return '';
}

export function syncStatusText(s: SyncState, ui: Record<string, string>, lang: Lang): string {
  if (s.status === 'stopped') return ui.stoppedNote;
  if (s.status === 'synced' && s.at) {
    const time = new Date(s.at).toLocaleTimeString(lang === 'da' ? 'da-DK' : 'en-GB');
    return ui.lastSynced.replace('{time}', time);
  }
  return ui[`sync_${s.status}`];
}
