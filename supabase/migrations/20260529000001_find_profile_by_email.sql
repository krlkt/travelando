-- Lookup helper used by the invite-by-email flow.
-- The `profiles owner read` policy blocks SELECTs on rows the caller doesn't
-- own, so an authenticated user can't search profiles by email directly.
-- This SECURITY DEFINER function bypasses RLS but only returns the single
-- matching row, so it doesn't leak the rest of the table.
create or replace function public.find_profile_by_email(p_email text)
returns table (id uuid, email text, display_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.email, p.display_name
  from public.profiles p
  where lower(p.email) = lower(p_email)
  limit 1;
$$;

revoke all on function public.find_profile_by_email(text) from public;
grant execute on function public.find_profile_by_email(text) to authenticated;
