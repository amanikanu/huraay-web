-- Launch day: upgrade every account to Pro and disable customization paywall

-- 1. Pro for all existing auth users (create missing entitlement rows too)
insert into public.account_entitlements (user_id, plan)
select users.id, 'pro'
from auth.users as users
on conflict (user_id) do update
set plan = 'pro', updated_at = now();

update public.account_entitlements
set plan = 'pro', updated_at = now()
where plan is distinct from 'pro';

-- 2. Pro for all new signups during launch
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
  values (new.id, 'pro')
  on conflict (user_id) do update
  set plan = 'pro', updated_at = now();

  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

-- 3. Remove the Pro theme/customization gate
drop trigger if exists enforce_page_customization_entitlement on public.birthday_pages;

create or replace function private.enforce_page_customization_entitlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  return new;
end;
$$;

revoke execute on function private.enforce_page_customization_entitlement()
from public, anon, authenticated;

-- 4. Launch limits from 202608200010 (idempotent)
create or replace function private.enforce_free_page_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  return new;
end;
$$;

create or replace function private.enforce_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_count integer := 15;
begin
  if (
    select count(*)
    from public.page_photos
    where page_id = new.page_id
  ) >= max_count then
    raise exception 'Photo limit reached';
  end if;

  return new;
end;
$$;

create or replace function private.enforce_wishlist_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  return new;
end;
$$;
