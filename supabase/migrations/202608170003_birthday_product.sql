create table public.account_entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','pro')),
  activated_at timestamptz,
  payment_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.birthday_pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  celebrant_name text not null check (char_length(celebrant_name) between 1 and 80),
  birthday_date date not null,
  headline text not null check (char_length(headline) between 1 and 120),
  introduction text check (char_length(introduction) <= 600),
  whatsapp_number text not null check (whatsapp_number ~ '^[1-9][0-9]{7,14}$'),
  theme_key text not null default 'clean',
  custom_primary text,
  custom_accent text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  vanity_slug text unique check (vanity_slug is null or vanity_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  show_fulfilled_items boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index birthday_pages_owner_id_idx on public.birthday_pages(owner_id);
create index birthday_pages_status_date_idx on public.birthday_pages(status,birthday_date);

create table public.page_photos (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.birthday_pages(id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null default '',
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  blur_hash text,
  sort_order smallint not null default 0 check (sort_order >= 0),
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);
create index page_photos_page_sort_idx on public.page_photos(page_id,sort_order);
create unique index page_photos_one_cover_idx on public.page_photos(page_id) where is_cover;

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  bank_name text not null check (char_length(bank_name) between 2 and 80),
  account_number text not null check (account_number ~ '^[0-9]{10}$'),
  account_name text not null check (char_length(account_name) between 2 and 120),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bank_accounts_owner_id_idx on public.bank_accounts(owner_id);
create unique index bank_accounts_one_default_idx on public.bank_accounts(owner_id) where is_default;

create table public.birthday_wishlist_items (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.birthday_pages(id) on delete cascade,
  bank_account_id uuid references public.bank_accounts(id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  description text check (char_length(description) <= 500),
  image_path text,
  price numeric(12,2) check (price is null or price >= 0),
  currency char(3) not null default 'NGN',
  purchase_url text check (purchase_url is null or purchase_url ~ '^https://'),
  available_anywhere boolean not null default false,
  allow_bank_transfer boolean not null default false,
  status text not null default 'available' check (status in ('available','fulfilled','hidden')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index birthday_wishlist_page_sort_idx on public.birthday_wishlist_items(page_id,sort_order);
create index birthday_wishlist_bank_account_idx on public.birthday_wishlist_items(bank_account_id);

create table public.birthday_wishes (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.birthday_pages(id) on delete cascade,
  selected_photo_id uuid not null references public.page_photos(id) on delete restrict,
  visitor_name text not null check (char_length(visitor_name) between 1 and 80),
  message text not null check (char_length(message) between 1 and 500),
  visibility text not null check (visibility in ('public','private')),
  moderation_status text not null default 'pending' check (moderation_status in ('pending','published','hidden')),
  pinned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index birthday_wishes_page_status_created_idx on public.birthday_wishes(page_id,moderation_status,created_at desc);
create index birthday_wishes_photo_id_idx on public.birthday_wishes(selected_photo_id);

create table public.visitor_page_access (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.birthday_pages(id) on delete cascade,
  wish_id uuid not null unique references public.birthday_wishes(id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  expires_at timestamptz not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index visitor_access_page_hash_idx on public.visitor_page_access(page_id,token_hash);
create index visitor_access_expires_idx on public.visitor_page_access(expires_at);

create table public.page_events (
  id bigint generated always as identity primary key,
  page_id uuid not null references public.birthday_pages(id) on delete cascade,
  event_name text not null check (event_name in ('page_view','wish_submitted','wishlist_unlocked','gift_clicked','bank_copied','whatsapp_intent','share')),
  visitor_hash text,
  wishlist_item_id uuid references public.birthday_wishlist_items(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index page_events_page_name_created_idx on public.page_events(page_id,event_name,created_at desc);
create index page_events_wishlist_item_idx on public.page_events(wishlist_item_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('paystack','manual')),
  amount_kobo bigint not null check (amount_kobo = 200000),
  currency char(3) not null default 'NGN',
  reference text not null unique,
  status text not null default 'pending' check (status in ('pending','successful','failed','refunded')),
  provider_payload jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_user_created_idx on public.payments(user_id,created_at desc);

create table public.manual_payment_submissions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references public.payments(id) on delete cascade,
  sender_name text not null,
  transfer_date date not null,
  transaction_reference text not null,
  receipt_path text not null,
  note text check (char_length(note) <= 500),
  status text not null default 'submitted' check (status in ('submitted','under_review','approved','rejected','more_information_required')),
  reviewer_id uuid references public.profiles(id) on delete set null,
  decision_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index manual_payments_status_created_idx on public.manual_payment_submissions(status,created_at);
create index manual_payments_reviewer_idx on public.manual_payment_submissions(reviewer_id);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin','support')),
  created_at timestamptz not null default now(),
  primary key (user_id,role)
);

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_actor_created_idx on public.admin_audit_logs(actor_id,created_at desc);
create index admin_audit_target_idx on public.admin_audit_logs(target_type,target_id);

create table public.page_themes (
  key text primary key,
  name text not null,
  is_pro boolean not null default false,
  tokens jsonb not null,
  sort_order smallint not null default 0
);

alter table public.account_entitlements enable row level security;
alter table public.birthday_pages enable row level security;
alter table public.page_photos enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.birthday_wishlist_items enable row level security;
alter table public.birthday_wishes enable row level security;
alter table public.visitor_page_access enable row level security;
alter table public.page_events enable row level security;
alter table public.payments enable row level security;
alter table public.manual_payment_submissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.page_themes enable row level security;

create policy "entitlement_owner_read" on public.account_entitlements for select to authenticated using (user_id=(select auth.uid()));
create policy "birthday_pages_owner_all" on public.birthday_pages for all to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy "photos_owner_all" on public.page_photos for all to authenticated using (exists(select 1 from public.birthday_pages p where p.id=page_id and p.owner_id=(select auth.uid()))) with check (exists(select 1 from public.birthday_pages p where p.id=page_id and p.owner_id=(select auth.uid())));
create policy "bank_accounts_owner_all" on public.bank_accounts for all to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy "wishlist_owner_all" on public.birthday_wishlist_items for all to authenticated using (exists(select 1 from public.birthday_pages p where p.id=page_id and p.owner_id=(select auth.uid()))) with check (exists(select 1 from public.birthday_pages p where p.id=page_id and p.owner_id=(select auth.uid())));
create policy "birthday_wishes_owner_read" on public.birthday_wishes for select to authenticated using (exists(select 1 from public.birthday_pages p where p.id=page_id and p.owner_id=(select auth.uid())));
create policy "birthday_wishes_owner_update" on public.birthday_wishes for update to authenticated using (exists(select 1 from public.birthday_pages p where p.id=page_id and p.owner_id=(select auth.uid()))) with check (exists(select 1 from public.birthday_pages p where p.id=page_id and p.owner_id=(select auth.uid())));
create policy "events_owner_read" on public.page_events for select to authenticated using (exists(select 1 from public.birthday_pages p where p.id=page_id and p.owner_id=(select auth.uid())));
create policy "payments_owner_read" on public.payments for select to authenticated using (user_id=(select auth.uid()));
create policy "manual_payment_owner_read" on public.manual_payment_submissions for select to authenticated using (exists(select 1 from public.payments p where p.id=payment_id and p.user_id=(select auth.uid())));
create policy "themes_authenticated_read" on public.page_themes for select to authenticated using (true);

revoke all on public.bank_accounts, public.birthday_wishlist_items, public.birthday_wishes, public.visitor_page_access, public.payments, public.manual_payment_submissions, public.user_roles, public.admin_audit_logs from anon;
grant select,insert,update,delete on public.birthday_pages,public.page_photos,public.bank_accounts,public.birthday_wishlist_items to authenticated;
grant select,update on public.birthday_wishes to authenticated;
grant select on public.account_entitlements,public.page_events,public.payments,public.manual_payment_submissions,public.page_themes to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('birthday-media','birthday-media',true,10485760,array['image/jpeg','image/png','image/webp','image/avif']),
('wishlist-media','wishlist-media',true,5242880,array['image/jpeg','image/png','image/webp','image/avif']),
('payment-receipts','payment-receipts',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do nothing;

create policy "birthday_media_owner_insert" on storage.objects for insert to authenticated with check(bucket_id='birthday-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "birthday_media_public_read" on storage.objects for select to anon,authenticated using(bucket_id='birthday-media');
create policy "birthday_media_owner_manage" on storage.objects for update to authenticated using(bucket_id='birthday-media' and owner_id=(select auth.uid()::text)) with check(bucket_id='birthday-media' and owner_id=(select auth.uid()::text));
create policy "birthday_media_owner_delete" on storage.objects for delete to authenticated using(bucket_id='birthday-media' and owner_id=(select auth.uid()::text));
create policy "wishlist_media_owner_insert" on storage.objects for insert to authenticated with check(bucket_id='wishlist-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "wishlist_media_public_read" on storage.objects for select to anon,authenticated using(bucket_id='wishlist-media');
create policy "receipt_owner_insert" on storage.objects for insert to authenticated with check(bucket_id='payment-receipts' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "receipt_owner_read" on storage.objects for select to authenticated using(bucket_id='payment-receipts' and owner_id=(select auth.uid()::text));
