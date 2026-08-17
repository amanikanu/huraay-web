create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  derived_name text;
begin
  derived_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Huraay user'
  );

  insert into public.profiles (id, display_name, full_name)
  values (new.id, left(derived_name, 80), left(derived_name, 80))
  on conflict (id) do update
  set full_name = coalesce(public.profiles.full_name, excluded.full_name);

  insert into public.account_entitlements (user_id, plan)
  values (new.id, 'free')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

insert into public.profiles (id, display_name, full_name)
select
  users.id,
  left(coalesce(
    nullif(trim(users.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
    'Huraay user'
  ), 80),
  left(coalesce(
    nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(users.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
    'Huraay user'
  ), 80)
from auth.users as users
on conflict (id) do nothing;

insert into public.account_entitlements (user_id, plan)
select profiles.id, 'free'
from public.profiles as profiles
on conflict (user_id) do nothing;
