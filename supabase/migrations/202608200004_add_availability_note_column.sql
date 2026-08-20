-- Migration: Add availability_note column to birthday_wishlist_items table if missing

alter table public.birthday_wishlist_items 
add column if not exists availability_note text;
