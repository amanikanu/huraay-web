-- Migration: Optional visitor email on birthday wishes for celebrant thank-you messages

alter table public.birthday_wishes
add column if not exists visitor_email text
check (
  visitor_email is null
  or (
    char_length(visitor_email) between 5 and 254
    and visitor_email ~* '^[^@]+@[^@]+\.[^@]+$'
  )
);
