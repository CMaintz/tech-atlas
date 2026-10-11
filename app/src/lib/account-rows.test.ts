import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { write, type Me, type Row } from './account-rows';

const me: Me = { id: 'u1', email: 'a@example.com', signedInAt: 0 };
const row: Row = { state: {}, version: 3, deleted_at: null };

function fakeClient(result: { data?: unknown; error?: { code?: string } | null }) {
  const chain = {
    insert: vi.fn(async () => result),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    select: vi.fn(async () => result),
  };
  const c = { from: vi.fn(() => chain) } as unknown as SupabaseClient;
  return { c, chain };
}

describe('write', () => {
  it('inserts the patch when there was no row', async () => {
    const { c, chain } = fakeClient({ error: null });
    expect(await write(c, me, { read: null, patch: { state: { a: 1 } } })).toBe(true);
    expect(chain.insert).toHaveBeenCalledWith({ user_id: 'u1', state: { a: 1 } });
    expect(chain.update).not.toHaveBeenCalled();
  });

  it('reports a lost race when another device inserted first', async () => {
    const { c } = fakeClient({ error: { code: '23505' } });
    expect(await write(c, me, { read: null, patch: {} })).toBe(false);
  });

  it('updates over the version it read', async () => {
    const { c, chain } = fakeClient({ data: [{ version: 4 }], error: null });
    expect(await write(c, me, { read: row, patch: { state: {} } })).toBe(true);
    expect(chain.update).toHaveBeenCalledWith({ state: {} });
    expect(chain.eq).toHaveBeenCalledWith('version', 3);
    expect(chain.insert).not.toHaveBeenCalled();
  });

  it('reports a lost race when no row matched the version', async () => {
    const { c } = fakeClient({ data: [], error: null });
    expect(await write(c, me, { read: row, patch: {} })).toBe(false);
  });
});
