-- Travelando: declining a *claimed* invite reverts to the name-only member
-- When an owner invites an existing name-only member (the "invite" action on a
-- name-only row), that same row is converted into a pending invite. If the
-- invitee declines, we should NOT lose the original participant — they were a
-- real name-only member before the invite (e.g. they're in expense splits).
-- A fresh email invite (no prior member) is still deleted on decline.
--
-- We mark claimed invites with revert_to_name_only so decline can tell the two
-- apart. The placeholder display_name is preserved through the invite, so a
-- revert just clears the account link and flips the row back to accepted.

alter table public.trip_members
  add column if not exists revert_to_name_only boolean not null default false;

create or replace function public.decline_trip_invitation(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_revert boolean;
begin
  if not public.invitation_belongs_to_caller(p_member_id) then
    raise exception 'invitation_not_found';
  end if;

  select revert_to_name_only into v_revert
    from public.trip_members
   where id = p_member_id;

  if coalesce(v_revert, false) then
    -- Revert to the original name-only member rather than deleting it.
    update public.trip_members
       set status              = 'accepted',
           user_id             = null,
           invited_email       = null,
           email               = null,
           revert_to_name_only = false
     where id = p_member_id;
  else
    delete from public.trip_members where id = p_member_id;
  end if;
end;
$$;

revoke all on function public.decline_trip_invitation(uuid) from public;
grant execute on function public.decline_trip_invitation(uuid) to authenticated;
