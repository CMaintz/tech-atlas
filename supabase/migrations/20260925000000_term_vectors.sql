-- Atlas: semantic search vectors (A65). One bge-m3 vector (1024 dimensions, unit length)
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
