-- Atlas: synced learner progress (A44). One row per user holding the same JSON
-- the browser keeps in localStorage (`atlas:learner:v2`); the browser merges it.
-- Row Level Security: a signed-in user can read and write only their own row.
--
-- version    — bumped by the server on every write; clients update only the version
--              they read (optimistic concurrency, A49), so no write is silently lost.
-- deleted_at — tombstone (A47): "Delete my synced data" empties `state` and sets it.
--              While set, `state` must stay '{}', so a device that was signed in
--              before the delete cannot write progress back; only an explicit
--              "start syncing again" (setting it back to null) reopens the row.

create table if not exists public.learner_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- The whole map is a few hundred terms (~100 bytes each); cap abuse far above that.
  constraint learner_state_size check (pg_column_size(state) < 512 * 1024),
  constraint learner_state_shape check (jsonb_typeof(state) = 'object'),
  constraint learner_state_tombstone check (deleted_at is null or state = '{}'::jsonb)
);

-- The server, not the client, decides version, updated_at and the deletion time.
create or replace function public.learner_state_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.version := 1;
    if new.deleted_at is not null then
      new.deleted_at := now();
    end if;
  else
    new.version := old.version + 1;
    if new.deleted_at is not null then
      new.deleted_at := coalesce(old.deleted_at, now());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists learner_state_touch on public.learner_state;
create trigger learner_state_touch
  before insert or update on public.learner_state
  for each row execute function public.learner_state_touch();

alter table public.learner_state enable row level security;

drop policy if exists "learner_state: read own" on public.learner_state;
create policy "learner_state: read own" on public.learner_state
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "learner_state: insert own" on public.learner_state;
create policy "learner_state: insert own" on public.learner_state
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "learner_state: update own" on public.learner_state;
create policy "learner_state: update own" on public.learner_state
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "learner_state: delete own" on public.learner_state;
create policy "learner_state: delete own" on public.learner_state
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Start from nothing, then grant exactly what the app uses. Signed-out visitors
-- (anon) get nothing; signed-in users get the four verbs, still limited to their
-- own row by the policies above.
revoke all on table public.learner_state from anon;
revoke all on table public.learner_state from authenticated;
grant select, insert, update, delete on table public.learner_state to authenticated;
