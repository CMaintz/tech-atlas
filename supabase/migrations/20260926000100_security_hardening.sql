-- Atlas: security review hardening (A89). Idempotent.
--
-- Supabase's default privileges grant EXECUTE on every new function in `public` to
-- anon and authenticated. The trigger function below cannot be called through the Data
-- API (it returns `trigger`), so this changes no behaviour; it makes the grants say what
-- is intended, so a later change to the function can't expose it by accident.
revoke all on function public.learner_state_touch() from public, anon, authenticated;

-- The rate-limit table sits in a schema the Data API doesn't expose and that anon /
-- authenticated can't use; RLS with no policies is a second lock should that change.
alter table private.search_rate enable row level security;
revoke all on table private.search_rate from public, anon, authenticated;
