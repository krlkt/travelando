-- Travelando: retire a leaving member instead of deleting them.
--
-- Hard-deleting a trip_members row breaks expense history two ways:
--   * expenses.payer_member_id and settlements.from/to_member_id are
--     ON DELETE RESTRICT — deleting a member who paid or settled fails with a
--     raw FK error.
--   * expense_shares.member_id is ON DELETE CASCADE — deleting a member who
--     only appeared in splits silently drops their share rows, so the remaining
--     shares no longer sum to the expense amount and balances quietly shift onto
--     everyone else.
--
-- So a member with any financial footprint is RETIRED into a name-only member
-- (account link cleared, status accepted, display_name preserved) rather than
-- deleted. Their row survives, every reference stays valid, and their balance
-- stays visible and settleable. A member with no footprint is still deleted.
--
-- Self-leave can't be done with a plain RLS update: the only update policy on
-- trip_members is owner-only, and a WITH CHECK of user_id = auth.uid() would
-- fail once user_id is nulled. This SECURITY DEFINER RPC authorizes the caller
-- in-DB (owner or the member themselves) and performs the change atomically,
-- mirroring the accept/decline invitation RPCs.

create or replace function public.remove_trip_member(
  p_trip_id uuid,
  p_member_id uuid
)
returns text -- 'deleted' | 'retired'
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id        uuid;
  v_member_user_id  uuid;
  v_member_trip     uuid;
  v_display         text;
  v_has_footprint   boolean;
  v_candidate       text;
  v_suffix          int := 1;
begin
  select owner_id into v_owner_id from public.trips where id = p_trip_id;
  if v_owner_id is null then
    raise exception 'trip_not_found';
  end if;

  select user_id, trip_id, display_name
    into v_member_user_id, v_member_trip, v_display
    from public.trip_members
   where id = p_member_id;

  if v_member_trip is null or v_member_trip <> p_trip_id then
    raise exception 'member_not_found';
  end if;

  -- The owner's mirrored member row cannot leave; they delete the trip instead.
  if v_member_user_id is not null and v_member_user_id = v_owner_id then
    raise exception 'owner_cannot_leave';
  end if;

  -- Authorize: caller is the trip owner, or is leaving their own row.
  if auth.uid() <> v_owner_id
     and (v_member_user_id is null or v_member_user_id <> auth.uid()) then
    raise exception 'not_authorized';
  end if;

  -- Financial footprint: paid an expense, appeared in a split, or was party to
  -- a settlement.
  select
    exists (
      select 1 from public.expenses e where e.payer_member_id = p_member_id
    )
    or exists (
      select 1 from public.expense_shares s where s.member_id = p_member_id
    )
    or exists (
      select 1 from public.settlements st
       where st.from_member_id = p_member_id
          or st.to_member_id = p_member_id
    )
    into v_has_footprint;

  if not v_has_footprint then
    delete from public.trip_members where id = p_member_id;
    return 'deleted';
  end if;

  -- Retire to a name-only member, preserving display_name. Resolve collisions
  -- against the (trip_id, lower(display_name)) where user_id is null unique
  -- index by appending " (left)", then " (left N)".
  v_candidate := v_display;
  if exists (
    select 1 from public.trip_members m
     where m.trip_id = p_trip_id
       and m.user_id is null
       and m.id <> p_member_id
       and lower(m.display_name) = lower(v_candidate)
  ) then
    v_candidate := v_display || ' (left)';
    v_suffix := 2;
    while exists (
      select 1 from public.trip_members m
       where m.trip_id = p_trip_id
         and m.user_id is null
         and m.id <> p_member_id
         and lower(m.display_name) = lower(v_candidate)
    ) loop
      v_candidate := v_display || ' (left ' || v_suffix || ')';
      v_suffix := v_suffix + 1;
    end loop;
  end if;

  update public.trip_members
     set status              = 'accepted',
         user_id             = null,
         invited_email       = null,
         email               = null,
         revert_to_name_only = false,
         display_name        = v_candidate
   where id = p_member_id;

  return 'retired';
end;
$$;

revoke all on function public.remove_trip_member(uuid, uuid) from public;
grant execute on function public.remove_trip_member(uuid, uuid) to authenticated;
