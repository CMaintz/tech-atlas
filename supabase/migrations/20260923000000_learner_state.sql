-- Atlas: synced learner progress (A44). One row per user holding the same JSON
-- the browser keeps in localStorage (`atlas:learner:v2`); the browser merges it.
-- Row Level Security: a signed-in user can read and write only their own row.

create table if not exists public.learner_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  -- The whole map is a few hundred terms (~100 bytes each); cap abuse far above that.
  constraint learner_state_size check (pg_column_size(state) < 512 * 1024),
  constraint learner_state_shape check (jsonb_typeof(state) = 'object')
);

-- The server, not the client clock, decides updated_at.
create or replace function public.learner_state_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
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

-- Signed-out visitors (the anon role) get nothing; signed-in users get the four
-- verbs, still limited to their own row by the policies above.
revoke all on public.learner_state from anon;
grant select, insert, update, delete on public.learner_state to authenticated;
