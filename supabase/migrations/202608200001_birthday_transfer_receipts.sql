alter table public.birthday_pages
  add column if not exists transfer_bank_name text,
  add column if not exists transfer_account_number text,
  add column if not exists transfer_account_name text;

alter table public.birthday_pages
  add constraint birthday_pages_transfer_bank_name_length
  check (transfer_bank_name is null or char_length(transfer_bank_name) between 2 and 80);

alter table public.birthday_pages
  add constraint birthday_pages_transfer_account_number_format
  check (transfer_account_number is null or transfer_account_number ~ '^[0-9]{10}$');

alter table public.birthday_pages
  add constraint birthday_pages_transfer_account_name_length
  check (transfer_account_name is null or char_length(transfer_account_name) between 2 and 120);

create table public.birthday_transfer_receipts (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.birthday_pages(id) on delete cascade,
  wish_id uuid references public.birthday_wishes(id) on delete set null,
  sender_name text not null check (char_length(sender_name) between 2 and 120),
  transfer_date date not null,
  transaction_reference text,
  amount numeric(12,2) check (amount is null or amount >= 0),
  note text check (char_length(note) <= 500),
  receipt_path text not null unique,
  status text not null default 'submitted' check (status in ('submitted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index birthday_transfer_receipts_page_created_idx
  on public.birthday_transfer_receipts(page_id, created_at desc);

create index birthday_transfer_receipts_wish_idx
  on public.birthday_transfer_receipts(wish_id);

alter table public.birthday_transfer_receipts enable row level security;

create policy "birthday_transfer_receipts_owner_read"
on public.birthday_transfer_receipts
for select to authenticated
using (
  exists (
    select 1
    from public.birthday_pages as page
    where page.id = page_id
      and page.owner_id = (select auth.uid())
  )
);

grant select on public.birthday_transfer_receipts to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'birthday-transfer-receipts',
  'birthday-transfer-receipts',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

drop policy if exists "birthday_transfer_receipts_owner_read" on storage.objects;

create policy "birthday_transfer_receipts_owner_read"
on storage.objects
for select to authenticated
using (
  bucket_id = 'birthday-transfer-receipts'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
