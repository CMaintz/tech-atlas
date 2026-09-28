-- Atlas: the feedback form (A100). Idempotent.
--
-- private.feedback holds what visitors send through the site's Feedback dialog. It sits
-- in a schema the Data API doesn't expose, with RLS on and no policies, and no grants
-- to anon / authenticated: nobody can read it through the API. Only the `feedback` Edge
-- Function writes to it, through public.feedback_submit (service role only).
--
-- Rate limit: counted from the rows themselves (per hashed IP: 5 an hour; site-wide:
-- 50 a day), so no extra counters are stored. A transaction-level advisory lock makes
-- check-then-insert atomic across concurrent requests.
--
-- Retention (the privacy page states it): a daily pg_cron job deletes rows older than
-- 180 days, and clears ip_hash (a hash of an IP address, still personal data) once a
-- row is 2 days old, when the rate limit no longer needs it.

create schema if not exists private;

create table if not exists private.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  category text not null check (category in ('bug', 'content', 'idea', 'other')),
  message text not null check (char_length(message) between 1 and 2000),
  reply_email text check (reply_email is null or char_length(reply_email) <= 254),
  page text check (page is null or char_length(page) <= 500),
  lang text not null check (lang in ('en', 'da')),
  ip_hash text check (ip_hash is null or char_length(ip_hash) <= 64)
);

create index if not exists feedback_ip_created on private.feedback (ip_hash, created_at);
create index if not exists feedback_created on private.feedback (created_at);

alter table private.feedback enable row level security;
revoke all on table private.feedback from public, anon, authenticated;

-- Returns 'ok' (stored) or 'limited' (not stored: over a rate limit).
create or replace function public.feedback_submit(
  client text,
  category text,
  message text,
  reply_email text,
  page text,
  lang text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  per_hour constant integer := 5;
  per_day constant integer := 50;
  n integer;
begin
  -- One submission at a time, so two concurrent requests can't both pass the count.
  perform pg_advisory_xact_lock(hashtext('atlas-feedback'));

  select count(*) into n from private.feedback f
    where f.ip_hash = left(client, 64) and f.created_at > now() - interval '1 hour';
  if n >= per_hour then
    return 'limited';
  end if;

  select count(*) into n from private.feedback f
    where f.created_at > now() - interval '1 day';
  if n >= per_day then
    return 'limited';
  end if;

  insert into private.feedback (category, message, reply_email, page, lang, ip_hash)
    values (category, message, reply_email, page, lang, left(client, 64));
  return 'ok';
end;
$$;

revoke all on function public.feedback_submit(text, text, text, text, text, text) from public;
revoke all on function public.feedback_submit(text, text, text, text, text, text) from anon, authenticated;
grant execute on function public.feedback_submit(text, text, text, text, text, text) to service_role;

-- Supabase Cron (pg_cron); enabled by 20260926000000_search_rate_retention.sql, repeated
-- here so this file also runs on its own. Scheduling under an existing name replaces it.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'atlas-feedback-purge',
  '17 3 * * *',
  $$delete from private.feedback where created_at < now() - interval '180 days'$$
);

select cron.schedule(
  'atlas-feedback-iphash-purge',
  '27 3 * * *',
  $$update private.feedback set ip_hash = null
      where ip_hash is not null and created_at < now() - interval '2 days'$$
);
