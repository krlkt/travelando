-- Travelando: prefer a name (not an email) for the owner's trip_members row
-- The previous migration fell back to `profiles.email` when display_name was
-- null, which surfaced as the full email address in the expense sheet and
-- members list. Use the email's local-part as a friendlier fallback, and
-- fix any rows that already stored the full email.

create or replace function public.ensure_owner_trip_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_email text;
begin
  if exists (
    select 1 from public.trip_members
    where trip_id = new.id and user_id = new.owner_id
  ) then
    return new;
  end if;

  select
    coalesce(
      p.display_name,
      nullif(split_part(p.email, '@', 1), ''),
      'Owner'
    ),
    p.email
  into v_display_name, v_email
  from public.profiles p
  where p.id = new.owner_id;

  insert into public.trip_members (trip_id, user_id, display_name, email, invited_by)
  values (
    new.id,
    new.owner_id,
    coalesce(v_display_name, 'Owner'),
    v_email,
    new.owner_id
  );

  return new;
end;
$$;

-- Fix already-backfilled owner rows that stored the full email --------
update public.trip_members tm
set display_name = coalesce(
  nullif(split_part(tm.email, '@', 1), ''),
  'Owner'
)
from public.trips t
where t.id = tm.trip_id
  and t.owner_id = tm.user_id
  and tm.email is not null
  and tm.display_name = tm.email;
