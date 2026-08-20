-- Migration: Make selected_photo_id nullable and update visibility constraint in birthday_wishes

alter table public.birthday_wishes 
alter column selected_photo_id drop not null;

alter table public.birthday_wishes 
drop constraint if exists birthday_wishes_visibility_check;

alter table public.birthday_wishes 
add constraint birthday_wishes_visibility_check 
check (visibility in ('public', 'private', 'anonymous'));
