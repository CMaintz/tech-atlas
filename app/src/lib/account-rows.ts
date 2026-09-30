/**
 * Reads and writes of the learner's own `learner_state` row (A44–A49). Stateless: the
 * sync loop in account.ts decides when to call these and what to do with the answers.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type Row = { state: unknown; version: number; deleted_at: string | null };
export type Me = { id: string; email: string; signedInAt: number };

const TABLE = 'learner_state';
/** Postgres unique_violation: another device inserted the row first. */
const DUPLICATE = '23505';

export async function pull(c: SupabaseClient, me: Me): Promise<Row | null> {
  const { data, error } = await c
    .from(TABLE)
    .select('state, version, deleted_at')
    .eq('user_id', me.id)
    .maybeSingle();
  if (error) throw error;
  return data as Row | null;
}

async function insertRow(c: SupabaseClient, me: Me, patch: Record<string, unknown>) {
  const { error } = await c.from(TABLE).insert({ user_id: me.id, ...patch });
  if (error?.code === DUPLICATE) return false;
  if (error) throw error;
  return true;
}

async function updateRow(c: SupabaseClient, me: Me, row: Row, patch: Record<string, unknown>) {
  const { data, error } = await c
    .from(TABLE)
    .update(patch)
    .eq('user_id', me.id)
    .eq('version', row.version)
    .select('version');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/**
 * Write `patch` over the version we read, or insert when there was no row. Returns
 * false when someone else wrote first (0 rows changed / duplicate insert), so the
 * caller re-pulls, re-merges and tries again (A49).
 */
export function write(
  c: SupabaseClient,
  me: Me,
  row: Row | null,
  patch: Record<string, unknown>,
): Promise<boolean> {
  return row ? updateRow(c, me, row, patch) : insertRow(c, me, patch);
}

/** Replace the row with a tombstone (A47): empty state, `deleted_at` set. Throws on failure. */
export async function writeTombstone(c: SupabaseClient, me: Me): Promise<void> {
  const { error } = await c
    .from(TABLE)
    .upsert({ user_id: me.id, state: {}, deleted_at: new Date().toISOString() });
  if (error) throw error;
}
