-- Travelando: remove_trip_member should return the retired row itself.
--
-- The previous version returned just 'deleted' | 'retired', and the caller
-- re-read the row with a follow-up SELECT. But when a member leaves their own
-- row, the RPC nulls their user_id, which immediately revokes their access via
-- can_access_trip(). The follow-up SELECT then runs as the now-removed user and
-- finds zero rows ("Cannot coerce the result to a single JSON object"), even
-- though the retire succeeded inside this SECURITY DEFINER function.
--
-- Returning the row from inside the function avoids the second, RLS-gated read.

drop function if exists public.remove_trip_member(uuid, uuid);

create or replace function public.remove_trip_member(
  p_trip_id uuid,
  p_member_id uuid
)
returns jsonb -- { "outcome": "deleted" } | { "outcome": "retired", "member": {...} }
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
  v_row             public.trip_members%rowtype;
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
    return jsonb_build_object('outcome', 'deleted');
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
   where id = p_member_id
   returning * into v_row;

  return jsonb_build_object(
    'outcome', 'retired',
    'member', jsonb_build_object(
      'id', v_row.id,
      'trip_id', v_row.trip_id,
      'user_id', v_row.user_id,
      'display_name', v_row.display_name,
      'email', v_row.email,
      'invited_by', v_row.invited_by,
      'status', v_row.status,
      'invited_email', v_row.invited_email,
      'revert_to_name_only', v_row.revert_to_name_only
    )
  );
end;
$$;

revoke all on function public.remove_trip_member(uuid, uuid) from public;
grant execute on function public.remove_trip_member(uuid, uuid) to authenticated;
