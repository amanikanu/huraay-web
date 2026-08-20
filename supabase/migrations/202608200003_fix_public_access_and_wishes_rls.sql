-- Migration: Fix public access permissions and RLS policies for birthday pages, photos, wishes, and wishlist items

-- 1. Grant table access permissions to anon and authenticated roles
grant select on public.birthday_pages to anon, authenticated;
grant select on public.page_photos to anon, authenticated;
grant select, insert on public.birthday_wishes to anon, authenticated;
grant select on public.birthday_wishlist_items to anon, authenticated;
grant insert on public.page_events to anon, authenticated;

-- 2. RLS Policy on birthday_pages: allow public reading of non-archived pages
drop policy if exists "birthday_pages_public_read" on public.birthday_pages;
create policy "birthday_pages_public_read"
on public.birthday_pages for select
to anon, authenticated
using (status <> 'archived');

-- 3. RLS Policy on page_photos: allow public reading of photos for active pages
drop policy if exists "photos_public_read" on public.page_photos;
create policy "photos_public_read"
on public.page_photos for select
to anon, authenticated
using (
  exists (
    select 1 from public.birthday_pages p
    where p.id = page_photos.page_id
      and p.status <> 'archived'
  )
);

-- 4. RLS Policy on birthday_wishes: allow public inserting of wishes for active pages
drop policy if exists "birthday_wishes_public_insert" on public.birthday_wishes;
create policy "birthday_wishes_public_insert"
on public.birthday_wishes for insert
to anon, authenticated
with check (
  exists (
    select 1 from public.birthday_pages p
    where p.id = birthday_wishes.page_id
      and p.status <> 'archived'
  )
);

-- RLS Policy on birthday_wishes: allow public reading of approved public wishes
drop policy if exists "birthday_wishes_public_read" on public.birthday_wishes;
create policy "birthday_wishes_public_read"
on public.birthday_wishes for select
to anon, authenticated
using (
  visibility = 'public'
  and moderation_status = 'published'
  and exists (
    select 1 from public.birthday_pages p
    where p.id = birthday_wishes.page_id
      and p.status <> 'archived'
  )
);

-- 5. RLS Policy on birthday_wishlist_items: allow public reading of wishlist items
drop policy if exists "wishlist_public_read" on public.birthday_wishlist_items;
create policy "wishlist_public_read"
on public.birthday_wishlist_items for select
to anon, authenticated
using (
  exists (
    select 1 from public.birthday_pages p
    where p.id = birthday_wishlist_items.page_id
      and p.status <> 'archived'
  )
);

-- 6. RLS Policy on page_events: allow public inserting of interaction events
drop policy if exists "events_public_insert" on public.page_events;
create policy "events_public_insert"
on public.page_events for insert
to anon, authenticated
with check (
  exists (
    select 1 from public.birthday_pages p
    where p.id = page_events.page_id
      and p.status <> 'archived'
  )
);

-- 7. Storage Bucket policies: allow public viewing of uploaded images
update storage.buckets
set public = true
where id in ('birthday-media', 'wishlist-media');

drop policy if exists "birthday_media_public_read" on storage.objects;
create policy "birthday_media_public_read"
on storage.objects for select
to anon, authenticated
using (bucket_id in ('birthday-media', 'wishlist-media'));
