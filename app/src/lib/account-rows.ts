import type { SupabaseClient, User } from '@supabase/supabase-js';

export type Row = { state: unknown; version: number; deleted_at: string | null };
export type Me = { id: string; email: string; signedInAt: number };
type RowPatch = Record<string, unknown>;
type VersionedWrite = { read: Row | null; patch: RowPatch };

export function meOf(u: User | undefined): Me | null {
  if (!u) return null;
  return { id: u.id, email: u.email ?? '', signedInAt: Date.parse(u.last_sign_in_at ?? '') || 0 };
}

const TABLE = 'learner_state';
const UNIQUE_VIOLATION = '23505';

export async function pull(c: SupabaseClient, me: Me): Promise<Row | null> {
  const { data, error } = await c
    .from(TABLE)
    .select('state, version, deleted_at')
    .eq('user_id', me.id)
    .maybeSingle();
  if (error) throw error;
  return data as Row | null;
}

async function insertRow(c: SupabaseClient, me: Me, patch: RowPatch) {
  const { error } = await c.from(TABLE).insert({ user_id: me.id, ...patch });
  if (error?.code === UNIQUE_VIOLATION) return false;
  if (error) throw error;
  return true;
}

async function updateRow(
  c: SupabaseClient,
  me: Me,
  { read, patch }: { read: Row; patch: RowPatch },
) {
  const { data, error } = await c
    .from(TABLE)
    .update(patch)
    .eq('user_id', me.id)
    .eq('version', read.version)
    .select('version');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export function write(c: SupabaseClient, me: Me, w: VersionedWrite): Promise<boolean> {
  return w.read ? updateRow(c, me, { read: w.read, patch: w.patch }) : insertRow(c, me, w.patch);
}

export async function writeTombstone(c: SupabaseClient, me: Me): Promise<void> {
  const { error } = await c
    .from(TABLE)
    .upsert({ user_id: me.id, state: {}, deleted_at: new Date().toISOString() });
  if (error) throw error;
}
