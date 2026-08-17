create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_path text,
  created_at timestamptz not null default now()
);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  celebrant_name text not null check (char_length(celebrant_name) between 1 and 80),
  occasion text not null,
  description text check (char_length(description) <= 1200),
  celebration_at timestamptz not null,
  cover_path text,
  status text not null default 'draft' check (status in ('draft','live','closed','archived')),
  moderation_enabled boolean not null default false,
  allow_anonymous boolean not null default true,
  allow_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_name text check (char_length(sender_name) between 1 and 80),
  message text not null check (char_length(message) between 1 and 2000),
  image_path text,
  visibility text not null default 'public' check (visibility in ('public','private')),
  is_anonymous boolean not null default false,
  moderation_status text not null default 'approved' check (moderation_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text check (char_length(description) <= 500),
  image_path text,
  purchase_url text,
  price numeric(12,2) check (price is null or price >= 0),
  currency char(3) not null default 'NGN',
  status text not null default 'available' check (status in ('available','reserved','purchased')),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index boards_owner_id_idx on public.boards(owner_id);
create index boards_status_celebration_idx on public.boards(status, celebration_at);
create index wishes_board_id_created_at_idx on public.wishes(board_id, created_at desc);
create index wishes_sender_id_idx on public.wishes(sender_id);
create index wishlist_items_board_id_idx on public.wishlist_items(board_id);
create index notifications_user_id_created_at_idx on public.notifications(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.boards enable row level security;
alter table public.wishes enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.notifications enable row level security;

create policy "profiles_read_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "boards_public_or_owned" on public.boards for select to anon, authenticated using (status = 'live' or (select auth.uid()) = owner_id);
create policy "boards_insert_own" on public.boards for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "boards_update_own" on public.boards for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "boards_delete_own" on public.boards for delete to authenticated using ((select auth.uid()) = owner_id);
create policy "wishes_public_or_owner" on public.wishes for select to anon, authenticated using (
  (visibility = 'public' and moderation_status = 'approved' and exists (select 1 from public.boards b where b.id = board_id and b.status = 'live'))
  or exists (select 1 from public.boards b where b.id = board_id and b.owner_id = (select auth.uid()))
);
create policy "wishes_submit_to_live_board" on public.wishes for insert to anon, authenticated with check (
  exists (select 1 from public.boards b where b.id = board_id and b.status = 'live')
  and (sender_id is null or sender_id = (select auth.uid()))
);
create policy "wishes_owner_moderates" on public.wishes for update to authenticated using (
  exists (select 1 from public.boards b where b.id = board_id and b.owner_id = (select auth.uid()))
) with check (exists (select 1 from public.boards b where b.id = board_id and b.owner_id = (select auth.uid())));
create policy "wishes_owner_deletes" on public.wishes for delete to authenticated using (exists (select 1 from public.boards b where b.id = board_id and b.owner_id = (select auth.uid())));
create policy "wishlist_public_or_owner" on public.wishlist_items for select to anon, authenticated using (exists (select 1 from public.boards b where b.id = board_id and (b.status = 'live' or b.owner_id = (select auth.uid()))));
create policy "wishlist_owner_all" on public.wishlist_items for all to authenticated using (exists (select 1 from public.boards b where b.id = board_id and b.owner_id = (select auth.uid()))) with check (exists (select 1 from public.boards b where b.id = board_id and b.owner_id = (select auth.uid())));
create policy "notifications_read_own" on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
create policy "notifications_update_own" on public.notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wish-media', 'wish-media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "wish_media_public_read" on storage.objects for select to anon, authenticated using (bucket_id = 'wish-media');
create policy "wish_media_authenticated_upload" on storage.objects for insert to authenticated with check (bucket_id = 'wish-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "wish_media_owner_update" on storage.objects for update to authenticated using (bucket_id = 'wish-media' and owner_id = (select auth.uid()::text)) with check (bucket_id = 'wish-media' and owner_id = (select auth.uid()::text));
create policy "wish_media_owner_delete" on storage.objects for delete to authenticated using (bucket_id = 'wish-media' and owner_id = (select auth.uid()::text));

grant usage on schema public to anon, authenticated;
grant select on public.boards, public.wishes, public.wishlist_items to anon;
grant select, insert, update, delete on public.profiles, public.boards, public.wishes, public.wishlist_items to authenticated;
grant select, update on public.notifications to authenticated;
grant usage, select on sequence public.notifications_id_seq to authenticated;
