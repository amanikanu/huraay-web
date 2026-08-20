-- Migration: Allow 'anonymous' in birthday_wishes visibility constraint

alter table public.birthday_wishes 
drop constraint if exists birthday_wishes_visibility_check;

alter table public.birthday_wishes 
add constraint birthday_wishes_visibility_check 
check (visibility in ('public', 'private', 'anonymous'));
