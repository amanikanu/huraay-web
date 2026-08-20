-- Migration: Fresh launch database cleanup script
-- Deletes all test pages, wishes, wishlist items, transfer receipts, user profiles, and auth accounts

-- 1. Delete all application data in cascading order
delete from public.page_events;
delete from public.birthday_transfer_receipts;
delete from public.birthday_wishes;
delete from public.birthday_wishlist_items;
delete from public.page_photos;
delete from public.birthday_pages;
delete from public.manual_payment_submissions;
delete from public.payments;
delete from public.user_roles;
delete from public.profiles;

-- 2. Delete all auth users from auth.users (resets user accounts so anyone can sign up clean)
delete from auth.users;
