drop policy if exists "members_read_board_team" on public.board_members;
drop policy if exists "members_owner_manage" on public.board_members;

create policy "members_read_board_team"
on public.board_members for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.boards as board
    where board.id = public.board_members.board_id
      and board.owner_id = (select auth.uid())
  )
);

create policy "members_owner_insert"
on public.board_members for insert to authenticated
with check (
  exists (
    select 1 from public.boards as board
    where board.id = public.board_members.board_id
      and board.owner_id = (select auth.uid())
  )
);

create policy "members_owner_update"
on public.board_members for update to authenticated
using (
  exists (
    select 1 from public.boards as board
    where board.id = public.board_members.board_id
      and board.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.boards as board
    where board.id = public.board_members.board_id
      and board.owner_id = (select auth.uid())
  )
);

create policy "members_owner_delete"
on public.board_members for delete to authenticated
using (
  exists (
    select 1 from public.boards as board
    where board.id = public.board_members.board_id
      and board.owner_id = (select auth.uid())
  )
);

drop policy if exists "manual_payment_owner_read" on public.manual_payment_submissions;
drop policy if exists "manual_payment_admin_read" on public.manual_payment_submissions;

create policy "manual_payment_relevant_read"
on public.manual_payment_submissions for select to authenticated
using (
  exists (
    select 1 from public.user_roles as roles
    where roles.user_id = (select auth.uid())
      and roles.role = 'admin'
  )
  or exists (
    select 1 from public.payments as payment
    where payment.id = public.manual_payment_submissions.payment_id
      and payment.user_id = (select auth.uid())
  )
);

drop policy if exists "audit_admin_read" on public.admin_audit_logs;

create policy "audit_admin_read"
on public.admin_audit_logs for select to authenticated
using (
  exists (
    select 1 from public.user_roles as roles
    where roles.user_id = (select auth.uid())
      and roles.role = 'admin'
  )
);

drop policy if exists "wishlist_public_or_owner" on public.wishlist_items;
drop policy if exists "wishlist_owner_all" on public.wishlist_items;

-- Birthday and wishlist files are only exposed through short-lived signed URLs.
-- Keeping both buckets private prevents draft photos and gated wishlist media
-- from being fetched directly by anonymous clients.
update storage.buckets
set public = false
where id in ('birthday-media', 'wishlist-media');

drop policy if exists "birthday_media_public_read" on storage.objects;
drop policy if exists "wishlist_media_public_read" on storage.objects;

create policy "wishlist_public_or_owner"
on public.wishlist_items for select to anon, authenticated
using (
  exists (
    select 1 from public.boards as board
    where board.id = public.wishlist_items.board_id
      and (
        board.status = 'live'
        or board.owner_id = (select auth.uid())
      )
  )
);

create policy "wishlist_owner_insert"
on public.wishlist_items for insert to authenticated
with check (
  exists (
    select 1 from public.boards as board
    where board.id = public.wishlist_items.board_id
      and board.owner_id = (select auth.uid())
  )
);

create policy "wishlist_owner_update"
on public.wishlist_items for update to authenticated
using (
  exists (
    select 1 from public.boards as board
    where board.id = public.wishlist_items.board_id
      and board.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.boards as board
    where board.id = public.wishlist_items.board_id
      and board.owner_id = (select auth.uid())
  )
);

create policy "wishlist_owner_delete"
on public.wishlist_items for delete to authenticated
using (
  exists (
    select 1 from public.boards as board
    where board.id = public.wishlist_items.board_id
      and board.owner_id = (select auth.uid())
  )
);
