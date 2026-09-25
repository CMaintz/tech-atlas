-- Atlas: a firm retention limit for the search rate-limit counters (A88).
--
-- private.search_rate holds, per client, a hash of the IP address (pseudonymised, but
-- still personal data: an IPv4 address can be guessed back from its hash) with a
-- per-minute count that expires after 2 minutes, plus a site-wide daily total with no
-- identifier that expires after 2 days. Until now expired rows were deleted only on
-- about 2% of searches, so without traffic a hashed IP could stay indefinitely.
--
-- Now: (1) every call to search_allow deletes expired rows (an index range delete on a
-- table of a few thousand rows at most), and (2) a pg_cron job deletes them every
-- 10 minutes whether or not anyone searches. A per-client row is therefore gone at most
-- ~12 minutes after it was created; the privacy page states "within 15 minutes".
--
-- Idempotent: safe to run again from the SQL editor or `supabase db push`.

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
  delete from private.search_rate where expires_at < now();

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

-- Supabase Cron (pg_cron), in schema pg_catalog as Supabase requires. Scheduling a job
-- under an existing name replaces it, so re-running this keeps exactly one job.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule(
  'atlas-search-rate-purge',
  '*/10 * * * *',
  $$delete from private.search_rate where expires_at < now()$$
);
