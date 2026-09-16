-- Ensure profiles are only readable/writable by their owner. Inserts are
-- handled exclusively by the SECURITY DEFINER trigger in
-- 20260916000000_profile_on_signup_trigger.sql, which bypasses RLS, so no
-- insert/delete policy is granted to clients here.

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
