-- Only allow account creation with a .edu email address.
-- Enforced at the database level so it can't be bypassed by calling the
-- Supabase Auth API directly (client-side checks are UX only).

create or replace function public.restrict_edu_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null or new.email !~* '@[^@]+\.edu$' then
    raise exception 'Only .edu email addresses are allowed to sign up.';
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_restriction on auth.users;

create trigger on_auth_user_email_restriction
  before insert on auth.users
  for each row
  execute function public.restrict_edu_email();
