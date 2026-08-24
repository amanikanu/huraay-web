-- Launch mode: allow all users to customize and edit birthday pages without Pro

-- Stop blocking non-default themes, custom colors, and vanity slugs
drop trigger if exists enforce_page_customization_entitlement on public.birthday_pages;

-- Allow unlimited pages during launch
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

-- Use the Pro photo cap for everyone during launch
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

-- Remove wishlist item cap during launch
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
