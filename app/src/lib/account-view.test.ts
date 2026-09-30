import { describe, expect, it } from 'vitest';
import { redirectError, syncStatusText } from './account-view';

describe('redirectError', () => {
  it('is empty without an error', () => {
    expect(redirectError('', '')).toBe('');
    expect(redirectError('?code=abc', '#x=1')).toBe('');
  });

  it('prefers the description, from the query or the hash', () => {
    expect(redirectError('?error=access_denied&error_description=Link+expired', '')).toBe(
      'Link expired',
    );
    expect(redirectError('', '#error=server_error')).toBe('server_error');
  });

  it('reads the query before the hash', () => {
    expect(redirectError('?error=first', '#error=second')).toBe('first');
  });
});

describe('syncStatusText', () => {
  const ui = {
    stoppedNote: 'Stopped',
    lastSynced: 'Synced at {time}',
    sync_synced: 'Synced',
    sync_error: 'Not synced',
  };

  it('explains a stopped sync', () => {
    expect(syncStatusText({ status: 'stopped', at: 5 }, ui, 'en')).toBe('Stopped');
  });

  it('gives the time of the last sync when known', () => {
    const text = syncStatusText({ status: 'synced', at: Date.UTC(2026, 0, 1, 12) }, ui, 'da');
    expect(text).toMatch(/^Synced at \d/);
  });

  it('falls back to the status string', () => {
    expect(syncStatusText({ status: 'synced' }, ui, 'en')).toBe('Synced');
    expect(syncStatusText({ status: 'error' }, ui, 'en')).toBe('Not synced');
  });
});
