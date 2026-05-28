-- Travelando: auto-add the trip owner as a trip_member
-- Expenses split via trip_members. Until now the owner row was only in
-- `trips.owner_id` and was not present in `trip_members`, so the owner
-- could not be selected as a participant on an expense. This migration
-- adds a trigger that mirrors the owner into trip_members on trip insert,
-- backfills existing trips, and prevents accidental removal of the
-- owner's own membership row.

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
  -- Skip if a row already exists for this (trip, owner) pair, which can
  -- happen on idempotent reapplications or manual backfills.
  if exists (
    select 1 from public.trip_members
    where trip_id = new.id and user_id = new.owner_id
  ) then
    return new;
  end if;

  select coalesce(p.display_name, p.email, 'Owner'),
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

drop trigger if exists trips_owner_as_member on public.trips;
create trigger trips_owner_as_member
  after insert on public.trips
  for each row execute function public.ensure_owner_trip_member();

-- Backfill existing trips ---------------------------------------------
insert into public.trip_members (trip_id, user_id, display_name, email, invited_by)
select
  t.id,
  t.owner_id,
  coalesce(p.display_name, p.email, 'Owner'),
  p.email,
  t.owner_id
from public.trips t
left join public.profiles p on p.id = t.owner_id
where not exists (
  select 1 from public.trip_members m
  where m.trip_id = t.id and m.user_id = t.owner_id
);

-- Guard: prevent removing the owner's own trip_members row ------------
create or replace function public.prevent_owner_member_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.user_id is not null and exists (
    select 1 from public.trips t
    where t.id = old.trip_id and t.owner_id = old.user_id
  ) then
    raise exception 'cannot remove the trip owner from members';
  end if;
  return old;
end;
$$;

drop trigger if exists trip_members_protect_owner on public.trip_members;
create trigger trip_members_protect_owner
  before delete on public.trip_members
  for each row execute function public.prevent_owner_member_delete();
