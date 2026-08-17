drop policy if exists "birthday_wishes_owner_delete" on public.birthday_wishes;

create policy "birthday_wishes_owner_delete"
on public.birthday_wishes for delete to authenticated
using (
  exists (
    select 1 from public.birthday_pages as page
    where page.id = public.birthday_wishes.page_id
      and page.owner_id = (select auth.uid())
  )
);

grant delete on public.birthday_wishes to authenticated;

create or replace function private.enforce_free_page_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_pro boolean;
begin
  select exists (
    select 1 from public.account_entitlements as entitlement
    where entitlement.user_id = new.owner_id
      and entitlement.plan = 'pro'
  ) into is_pro;

  if not is_pro and (
    select count(*) from public.birthday_pages as page
    where page.owner_id = new.owner_id
  ) >= 1 then
    raise exception 'Free accounts can create one Birthday Page';
  end if;

  return new;
end;
$$;

create or replace function private.enforce_page_customization_entitlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_pro boolean;
begin
  select exists (
    select 1 from public.account_entitlements as entitlement
    where entitlement.user_id = new.owner_id
      and entitlement.plan = 'pro'
  ) into is_pro;

  if not is_pro and (
    new.theme_key not in ('clean', 'editorial', 'soft')
    or new.custom_primary is not null
    or new.custom_accent is not null
    or new.vanity_slug is not null
  ) then
    raise exception 'This Birthday Page customization requires Huraay Pro';
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_page_customization_entitlement()
from public, anon, authenticated;

drop trigger if exists enforce_page_customization_entitlement on public.birthday_pages;
create trigger enforce_page_customization_entitlement
before insert or update of owner_id, theme_key, custom_primary, custom_accent, vanity_slug
on public.birthday_pages
for each row execute function private.enforce_page_customization_entitlement();

create or replace function private.validate_birthday_asset_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  page_owner uuid;
  account_owner uuid;
begin
  select owner_id into page_owner
  from public.birthday_pages
  where id = new.page_id;

  if page_owner is null then
    raise exception 'Birthday Page not found';
  end if;

  if tg_table_name = 'page_photos'
     and split_part(new.storage_path, '/', 1) <> page_owner::text then
    raise exception 'Photo path does not belong to the Birthday Page owner';
  end if;

  if tg_table_name = 'birthday_wishlist_items' then
    if new.image_path is not null
       and split_part(new.image_path, '/', 1) <> page_owner::text then
      raise exception 'Wishlist image does not belong to the Birthday Page owner';
    end if;

    if new.bank_account_id is not null then
      select owner_id into account_owner
      from public.bank_accounts
      where id = new.bank_account_id;

      if account_owner is distinct from page_owner then
        raise exception 'Bank account does not belong to the Birthday Page owner';
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function private.validate_birthday_asset_ownership()
from public, anon, authenticated;

drop trigger if exists validate_page_photo_ownership on public.page_photos;
create trigger validate_page_photo_ownership
before insert or update of page_id, storage_path
on public.page_photos
for each row execute function private.validate_birthday_asset_ownership();

drop trigger if exists validate_wishlist_asset_ownership on public.birthday_wishlist_items;
create trigger validate_wishlist_asset_ownership
before insert or update of page_id, image_path, bank_account_id
on public.birthday_wishlist_items
for each row execute function private.validate_birthday_asset_ownership();
