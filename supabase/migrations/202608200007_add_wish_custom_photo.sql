-- Migration: Add custom_photo_path column to birthday_wishes table for visitor custom photo uploads

alter table public.birthday_wishes 
add column if not exists custom_photo_path text;
