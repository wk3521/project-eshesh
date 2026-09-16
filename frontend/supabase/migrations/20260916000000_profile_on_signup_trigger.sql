-- Auto-create a profile row whenever a new auth user is created, instead of
-- trusting a client-supplied id via a public API route (see app/api/profile).
-- Fields are read from the metadata passed to supabase.auth.signUp({ options: { data: {...} } }).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grad_year integer;
begin
  v_grad_year := case
    when (new.raw_user_meta_data ->> 'grad_year') ~ '^\d{4}$'
      then (new.raw_user_meta_data ->> 'grad_year')::integer
    else null
  end;

  insert into public.profiles (
    id,
    full_name,
    school,
    major,
    grad_year,
    bio,
    avatar_url,
    created_at
  )
  values (
    new.id,
    trim(
      coalesce(new.raw_user_meta_data ->> 'first_name', '') || ' ' ||
      coalesce(new.raw_user_meta_data ->> 'last_name', '')
    ),
    new.raw_user_meta_data ->> 'school',
    new.raw_user_meta_data ->> 'major',
    v_grad_year,
    null,
    null,
    now()
  );

  return new;
exception
  when others then
    -- Never block auth user creation because of a profile insert problem.
    raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
