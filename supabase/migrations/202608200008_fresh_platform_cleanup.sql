-- Migration: Fresh launch cleanup script
-- Deletes all test pages, wishes, wishlist items, transfer receipts, and test user profiles

-- 1. Delete all test data in cascading order
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

-- 2. Clear storage objects in buckets
delete from storage.objects where bucket_id in ('birthday-media', 'wishlist-media', 'payment-receipts', 'birthday-transfer-receipts');

-- 3. Delete all auth users in auth.users table (Note: Run this in SQL Editor with postgres role to reset auth users)
-- delete from auth.users;
