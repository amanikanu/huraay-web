create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.boards add column if not exists theme text not null default 'sage' check (theme in ('sage','sky','sun','rose'));
alter table public.boards add column if not exists submissions_closed_at timestamptz;
alter table public.wishlist_items add column if not exists contribution_target numeric(12,2) check (contribution_target is null or contribution_target > 0);
alter table public.wishlist_items add column if not exists amount_contributed numeric(12,2) not null default 0 check (amount_contributed >= 0);

create table public.board_members (
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'editor' check (role in ('editor','moderator')),
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);
create index board_members_user_id_idx on public.board_members(user_id);

create table public.reactions (
  id bigint generated always as identity primary key,
  wish_id uuid not null references public.wishes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('celebrate','clap','love','laugh')),
  created_at timestamptz not null default now(),
  unique (wish_id, user_id, emoji)
);
create index reactions_wish_id_idx on public.reactions(wish_id);
create index reactions_user_id_idx on public.reactions(user_id);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  wishlist_item_id uuid not null references public.wishlist_items(id) on delete cascade,
  contributor_id uuid references public.profiles(id) on delete set null,
  contributor_name text check (char_length(contributor_name) between 1 and 80),
  amount numeric(12,2) not null check (amount > 0),
  currency char(3) not null,
  payment_reference text unique,
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now()
);
create index contributions_wishlist_item_id_idx on public.contributions(wishlist_item_id);
create index contributions_contributor_id_idx on public.contributions(contributor_id);

create table public.content_reports (
  id bigint generated always as identity primary key,
  wish_id uuid not null references public.wishes(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null check (reason in ('spam','abuse','privacy','other')),
  details text check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open','reviewed','resolved')),
  created_at timestamptz not null default now()
);
create index content_reports_wish_id_idx on public.content_reports(wish_id);
create index content_reports_reporter_id_idx on public.content_reports(reporter_id);

alter table public.board_members enable row level security;
alter table public.reactions enable row level security;
alter table public.contributions enable row level security;
alter table public.content_reports enable row level security;

create policy "members_read_board_team" on public.board_members for select to authenticated using (
  user_id = (select auth.uid()) or exists (select 1 from public.boards b where b.id = board_id and b.owner_id = (select auth.uid()))
);
create policy "members_owner_manage" on public.board_members for all to authenticated using (
  exists (select 1 from public.boards b where b.id = board_id and b.owner_id = (select auth.uid()))
) with check (exists (select 1 from public.boards b where b.id = board_id and b.owner_id = (select auth.uid())));

create policy "reactions_public_read" on public.reactions for select to anon, authenticated using (
  exists (select 1 from public.wishes w join public.boards b on b.id = w.board_id where w.id = wish_id and w.visibility = 'public' and w.moderation_status = 'approved' and b.status = 'live')
);
create policy "reactions_create_own" on public.reactions for insert to authenticated with check (user_id = (select auth.uid()));
create policy "reactions_delete_own" on public.reactions for delete to authenticated using (user_id = (select auth.uid()));

create policy "contributions_read_relevant" on public.contributions for select to authenticated using (
  contributor_id = (select auth.uid()) or exists (
    select 1 from public.wishlist_items wi join public.boards b on b.id = wi.board_id
    where wi.id = wishlist_item_id and b.owner_id = (select auth.uid())
  )
);
create policy "reports_create" on public.content_reports for insert to anon, authenticated with check (reporter_id is null or reporter_id = (select auth.uid()));
create policy "reports_board_owner_read" on public.content_reports for select to authenticated using (
  exists (select 1 from public.wishes w join public.boards b on b.id = w.board_id where w.id = wish_id and b.owner_id = (select auth.uid()))
);

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name',''), split_part(new.email,'@',1)));
  return new;
end;
$$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create or replace function private.sync_contribution_total()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.wishlist_items
  set amount_contributed = coalesce((select sum(c.amount) from public.contributions c where c.wishlist_item_id = coalesce(new.wishlist_item_id, old.wishlist_item_id) and c.status = 'paid'), 0)
  where id = coalesce(new.wishlist_item_id, old.wishlist_item_id);
  return coalesce(new, old);
end;
$$;
revoke execute on function private.sync_contribution_total() from public, anon, authenticated;
create trigger contributions_sync_total after insert or update of status or delete on public.contributions for each row execute function private.sync_contribution_total();

update storage.buckets set public = false where id = 'wish-media';
drop policy if exists "wish_media_public_read" on storage.objects;
create policy "wish_media_authenticated_read" on storage.objects for select to authenticated using (
  bucket_id = 'wish-media' and (owner_id = (select auth.uid()::text) or exists (
    select 1 from public.wishes w join public.boards b on b.id = w.board_id
    where w.image_path = name and b.owner_id = (select auth.uid())
  ))
);

grant select, insert, delete on public.reactions to authenticated;
grant select on public.reactions to anon;
grant select, insert, update, delete on public.board_members to authenticated;
grant select on public.contributions to authenticated;
grant insert on public.content_reports to anon, authenticated;
grant select, update on public.content_reports to authenticated;
grant usage, select on sequence public.reactions_id_seq to authenticated;
grant usage, select on sequence public.content_reports_id_seq to anon, authenticated;

alter publication supabase_realtime add table public.wishes;
alter publication supabase_realtime add table public.notifications;
