-- Migration: Fix visitor wish photo uploads blocked by storage RLS (direct upload fallback)

create or replace function public.can_upload_wish_photo(object_path text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.birthday_pages as page
    where page.id::text = (storage.foldername(object_path))[2]
      and page.status <> 'archived'
  );
$$;

revoke all on function public.can_upload_wish_photo(text) from public;
grant execute on function public.can_upload_wish_photo(text) to anon, authenticated;

drop policy if exists "birthday_media_wish_visitor_insert" on storage.objects;

create policy "birthday_media_wish_visitor_insert"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'birthday-media'
  and (storage.foldername(name))[1] = 'wishes'
  and public.can_upload_wish_photo(name)
);
