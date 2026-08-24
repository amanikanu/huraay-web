-- Launch mode: let signed-in users grant themselves Pro in the database so triggers pass

create or replace function public.grant_launch_pro()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  insert into public.account_entitlements (user_id, plan)
  values (auth.uid(), 'pro')
  on conflict (user_id) do update
  set plan = excluded.plan, updated_at = now();
end;
$$;

revoke all on function public.grant_launch_pro() from public;
grant execute on function public.grant_launch_pro() to authenticated;

-- Existing users: unlock Pro in the database immediately
update public.account_entitlements
set plan = 'pro', updated_at = now()
where plan <> 'pro';

-- Stop blocking premium themes and customization
drop trigger if exists enforce_page_customization_entitlement on public.birthday_pages;
