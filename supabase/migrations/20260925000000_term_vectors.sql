-- Atlas: semantic search vectors (A74). One bge-m3 vector (1024 dimensions, unit length)
-- per term and language, embedded offline by `npm run embed` and seeded by CI
-- (app/scripts/seed-vectors.ts) — the `semantic-search` Edge Function embeds the query
-- with the same model and calls match_terms. Content is public (it is on the site), so
-- anyone may read; only the service role (CI) writes.
--
-- Idempotent: safe to run again from the SQL editor or `supabase db push`.

create extension if not exists vector with schema extensions;

create table if not exists public.term_vectors (
  id text not null,
  lang text not null,
  embedding extensions.vector(1024) not null,
  -- Hash of the embedded passage (name, aliases, summary, plain facet), as in the
  -- committed vector file; lets anyone see which text a row was embedded from.
  passage_hash text not null,
  primary key (id, lang),
  constraint term_vectors_lang check (lang in ('en', 'da'))
);

alter table public.term_vectors enable row level security;

drop policy if exists "term_vectors: public read" on public.term_vectors;
create policy "term_vectors: public read" on public.term_vectors
  for select to anon, authenticated
  using (true);

-- Read-only for everyone but the service role (which bypasses RLS and grants).
revoke all on table public.term_vectors from anon;
revoke all on table public.term_vectors from authenticated;
grant select on table public.term_vectors to anon, authenticated;

-- The nearest terms to a query vector: cosine similarity, each term scoring its better
-- language (a Danish query finds an English-named term and vice versa). A few hundred
-- rows, so an exact scan is fast and needs no index.
create or replace function public.match_terms(
  query_embedding extensions.vector(1024),
  match_count integer default 8
)
returns table (id text, score real)
language sql
stable
security invoker
set search_path = ''
as $$
  select v.id, max(1 - (v.embedding operator(extensions.<=>) query_embedding))::real as score
  from public.term_vectors v
  group by v.id
  order by score desc
  limit least(greatest(coalesce(match_count, 8), 1), 50);
$$;

revoke all on function public.match_terms(extensions.vector, integer) from public;
grant execute on function public.match_terms(extensions.vector, integer) to anon, authenticated;

-- Abuse limits for the `semantic-search` function (A76), shared by every isolate:
-- at most 30 searches per client per minute and 50,000 per day overall. Counters live
-- in a schema the Data API does not expose; clients are keyed by a hash of their IP
-- (computed in the function), never the address. Only the service role — the function —
-- may call search_allow, so nobody can burn the daily budget through the API directly.
create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table if not exists private.search_rate (
  bucket text primary key,
  count integer not null,
  expires_at timestamptz not null
);
create index if not exists search_rate_expires on private.search_rate (expires_at);

create or replace function public.search_allow(client text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  per_minute constant integer := 30;
  per_day constant integer := 50000;
  minute_key text := 'ip:' || left(client, 64) || ':' || to_char(now() at time zone 'utc', 'YYYYMMDDHH24MI');
  day_key text := 'day:' || to_char(now() at time zone 'utc', 'YYYYMMDD');
  n integer;
begin
  -- Old buckets are cleared now and then; the table stays a few thousand rows at most.
  if random() < 0.02 then
    delete from private.search_rate where expires_at < now();
  end if;

  -- Per client first, so one flooding client can't use up everyone's daily budget.
  insert into private.search_rate as r (bucket, count, expires_at)
    values (minute_key, 1, now() + interval '2 minutes')
    on conflict (bucket) do update set count = r.count + 1
    returning r.count into n;
  if n > per_minute then
    return false;
  end if;

  insert into private.search_rate as r (bucket, count, expires_at)
    values (day_key, 1, now() + interval '2 days')
    on conflict (bucket) do update set count = r.count + 1
    returning r.count into n;
  return n <= per_day;
end;
$$;

revoke all on function public.search_allow(text) from public;
revoke all on function public.search_allow(text) from anon, authenticated;
grant execute on function public.search_allow(text) to service_role;
