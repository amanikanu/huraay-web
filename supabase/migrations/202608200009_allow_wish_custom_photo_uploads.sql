-- Migration: Allow visitors to upload custom wish photos on published birthday pages

drop policy if exists "birthday_media_wish_visitor_insert" on storage.objects;

create policy "birthday_media_wish_visitor_insert"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'birthday-media'
  and (storage.foldername(name))[1] = 'wishes'
  and exists (
    select 1
    from public.birthday_pages p
    where p.id::text = (storage.foldername(name))[2]
      and p.status = 'published'
  )
);
