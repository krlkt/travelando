-- Travelando: transfer trip ownership to another member.
--
-- Ownership is a single column (trips.owner_id) that gates trip deletion,
-- member management, and the "owner cannot leave" rule. Until now it could
-- only ever be the creator, so an owner who left the group had no way out
-- other than deleting the trip.
--
-- Two things happen here:
--
--   1. transfer_trip_ownership() — a SECURITY DEFINER RPC that hands the trip
--      to an accepted member with a linked account. The outgoing owner keeps
--      their mirrored trip_members row, so their expense history, splits, and
--      balances are untouched; they simply become a regular member.
--
--   2. A guard trigger on trips. The "trips member update" RLS policy lets any
--      accepted member UPDATE the trip row, which included owner_id — a member
--      talking to PostgREST directly could have made themselves owner. The
--      trigger rejects every owner_id change that doesn't come from the RPC,
--      which announces itself with a transaction-local setting.

-- Guard: owner_id may only change via transfer_trip_ownership() -----------
create or replace function public.guard_trip_owner_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is distinct from old.owner_id
     and coalesce(current_setting('travelando.owner_transfer', true), '')
         <> old.id::text then
    raise exception 'owner_transfer_not_allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists trips_guard_owner_change on public.trips;
create trigger trips_guard_owner_change
  before update on public.trips
  for each row execute function public.guard_trip_owner_change();

-- Transfer ownership ------------------------------------------------------
-- Returns the new owner's user id.
create or replace function public.transfer_trip_ownership(
  p_trip_id   uuid,
  p_member_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id       uuid;
  v_member_trip    uuid;
  v_member_user_id uuid;
  v_member_status  text;
begin
  select owner_id into v_owner_id from public.trips where id = p_trip_id;
  if v_owner_id is null then
    raise exception 'trip_not_found';
  end if;

  -- Only the current owner can hand the trip over.
  if auth.uid() is null or auth.uid() <> v_owner_id then
    raise exception 'not_authorized';
  end if;

  select trip_id, user_id, status
    into v_member_trip, v_member_user_id, v_member_status
    from public.trip_members
   where id = p_member_id;

  if v_member_trip is null or v_member_trip <> p_trip_id then
    raise exception 'member_not_found';
  end if;

  -- A name-only member has no account to own the trip, and a pending invitee
  -- hasn't accepted yet — neither can hold owner rights.
  if v_member_user_id is null then
    raise exception 'member_has_no_account';
  end if;
  if v_member_status <> 'accepted' then
    raise exception 'member_not_accepted';
  end if;
  if v_member_user_id = v_owner_id then
    raise exception 'already_owner';
  end if;

  -- Announce the sanctioned change to guard_trip_owner_change(). The setting
  -- is transaction-local, so it cannot leak into a later statement.
  perform set_config('travelando.owner_transfer', p_trip_id::text, true);
  update public.trips set owner_id = v_member_user_id where id = p_trip_id;
  perform set_config('travelando.owner_transfer', '', true);

  return v_member_user_id;
end;
$$;

revoke all on function public.transfer_trip_ownership(uuid, uuid) from public;
grant execute on function public.transfer_trip_ownership(uuid, uuid) to authenticated;
