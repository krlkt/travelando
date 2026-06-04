-- Travelando: invitation accept/decline for trip members
-- Previously, adding a member by email immediately linked their user_id, and
-- can_access_trip() granted access to anyone present in trip_members. That made
-- every invite auto-accepted. This migration introduces a pending state:
--   * trip_members.status = 'pending' | 'accepted'
--   * email invites land as 'pending' and grant NO access until accepted
--   * can_access_trip() now requires status = 'accepted'
--   * invitees discover/accept/decline via SECURITY DEFINER RPCs, since RLS
--     otherwise hides a trip they cannot yet access
--   * invites to a not-yet-registered email are linked to the new account at
--     signup, then still wait for the user to accept

-- Schema ----------------------------------------------------------------
alter table public.trip_members
  add column if not exists status text not null default 'accepted',
  add column if not exists invited_email text;

alter table public.trip_members
  drop constraint if exists trip_members_status_check;
alter table public.trip_members
  add constraint trip_members_status_check
  check (status in ('pending', 'accepted'));

create index if not exists trip_members_invited_email_idx
  on public.trip_members (lower(invited_email))
  where invited_email is not null;

create index if not exists trip_members_pending_user_idx
  on public.trip_members (user_id, status)
  where user_id is not null;

-- Existing rows (owners, previously auto-accepted members, name-only) are all
-- treated as accepted. The NOT NULL DEFAULT already backfilled them; this is an
-- explicit safety net in case the column pre-existed without the default.
update public.trip_members set status = 'accepted' where status is null;

-- Access gate -----------------------------------------------------------
-- Only the owner and *accepted* members can access a trip. Pending invitees
-- are intentionally excluded until they accept.
create or replace function public.can_access_trip(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trips t
    where t.id = p_trip_id and t.owner_id = auth.uid()
  ) or exists (
    select 1 from public.trip_members m
    where m.trip_id = p_trip_id
      and m.user_id = auth.uid()
      and m.status = 'accepted'
  );
$$;

revoke all on function public.can_access_trip(uuid) from public;
grant execute on function public.can_access_trip(uuid) to anon, authenticated;

-- List my invitations ---------------------------------------------------
-- An invitee cannot SELECT the trip (RLS) or even their own pending member row
-- until they accept, so this SECURITY DEFINER function returns just the pending
-- invitations addressed to the caller, joined with the trip summary they need
-- to decide. Matched either by linked user_id or by the invited email.
create or replace function public.list_my_invitations()
returns table (
  member_id        uuid,
  trip_id          uuid,
  trip_title       text,
  trip_destination text,
  trip_start_date  date,
  trip_end_date    date,
  cover_gradient   text,
  owner_name       text,
  invited_at       timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    t.id,
    t.title,
    t.destination,
    t.start_date,
    t.end_date,
    t.cover_gradient,
    coalesce(
      op.display_name,
      nullif(split_part(op.email, '@', 1), ''),
      'Trip owner'
    ),
    m.created_at
  from public.trip_members m
  join public.trips t on t.id = m.trip_id
  left join public.profiles op on op.id = t.owner_id
  where m.status = 'pending'
    and (
      m.user_id = auth.uid()
      or (
        m.invited_email is not null
        and lower(m.invited_email) = lower(coalesce(
          (select p.email from public.profiles p where p.id = auth.uid()),
          ''
        ))
      )
    )
  order by m.created_at desc;
$$;

revoke all on function public.list_my_invitations() from public;
grant execute on function public.list_my_invitations() to authenticated;

-- Helper: does the given pending member row belong to the caller? --------
create or replace function public.invitation_belongs_to_caller(p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_members m
    where m.id = p_member_id
      and m.status = 'pending'
      and (
        m.user_id = auth.uid()
        or (
          m.invited_email is not null
          and lower(m.invited_email) = lower(coalesce(
            (select p.email from public.profiles p where p.id = auth.uid()),
            ''
          ))
        )
      )
  );
$$;

revoke all on function public.invitation_belongs_to_caller(uuid) from public;
grant execute on function public.invitation_belongs_to_caller(uuid) to authenticated;

-- Accept an invitation ---------------------------------------------------
-- Flips the row to accepted, links the caller's account, and replaces the
-- placeholder name with the user's real profile name.
create or replace function public.accept_trip_invitation(p_member_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
  v_name text;
begin
  if not public.invitation_belongs_to_caller(p_member_id) then
    raise exception 'invitation_not_found';
  end if;

  select coalesce(
           p.display_name,
           nullif(split_part(p.email, '@', 1), ''),
           'Member'
         )
    into v_name
    from public.profiles p
   where p.id = auth.uid();

  update public.trip_members
     set status        = 'accepted',
         user_id       = auth.uid(),
         display_name  = coalesce(v_name, display_name),
         invited_email = null
   where id = p_member_id
   returning trip_id into v_trip_id;

  return v_trip_id;
end;
$$;

revoke all on function public.accept_trip_invitation(uuid) from public;
grant execute on function public.accept_trip_invitation(uuid) to authenticated;

-- Decline an invitation --------------------------------------------------
-- Deletes the pending row entirely (owner can re-invite later).
create or replace function public.decline_trip_invitation(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.invitation_belongs_to_caller(p_member_id) then
    raise exception 'invitation_not_found';
  end if;

  delete from public.trip_members where id = p_member_id;
end;
$$;

revoke all on function public.decline_trip_invitation(uuid) from public;
grant execute on function public.decline_trip_invitation(uuid) to authenticated;

-- Link pending invites at signup ----------------------------------------
-- Extends handle_new_user so an invite addressed to an email that had no
-- account yet attaches to the new profile. Status stays 'pending' so the user
-- still chooses to accept; this only makes the invite discoverable to them.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do update
    set email        = excluded.email,
        display_name = coalesce(excluded.display_name, public.profiles.display_name),
        avatar_url   = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  -- Attach any pending invites addressed to this email to the new account.
  if new.email is not null then
    update public.trip_members
       set user_id = new.id
     where user_id is null
       and status = 'pending'
       and invited_email is not null
       and lower(invited_email) = lower(new.email);
  end if;

  return new;
end;
$$;
