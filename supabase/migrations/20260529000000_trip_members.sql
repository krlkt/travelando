-- Travelando: trip_members + collaboration RLS
-- Introduces shared trips. A trip is accessible to its owner and any user
-- listed in trip_members (with user_id = auth.uid()). Members can also be
-- name-only entries that represent non-app users.

create extension if not exists "pgcrypto";

-- trip_members ----------------------------------------------------------
-- user_id references public.profiles instead of auth.users so PostgREST can
-- embed the profile row via the FK (profiles.id is itself an FK to auth.users,
-- so cascading delete still chains through).
create table if not exists public.trip_members (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete cascade,
  display_name  text not null,
  email         text,
  invited_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists trip_members_unique_user
  on public.trip_members (trip_id, user_id)
  where user_id is not null;

create unique index if not exists trip_members_unique_name
  on public.trip_members (trip_id, lower(display_name))
  where user_id is null;

create index if not exists trip_members_user_idx
  on public.trip_members (user_id)
  where user_id is not null;

create index if not exists trip_members_trip_idx
  on public.trip_members (trip_id);

drop trigger if exists trip_members_set_updated_at on public.trip_members;
create trigger trip_members_set_updated_at
  before update on public.trip_members
  for each row execute function public.set_updated_at();

-- Access helper ---------------------------------------------------------
-- SECURITY DEFINER avoids RLS recursion when RLS policies query the same
-- tables. search_path is locked to public to prevent hijacks.
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
    where m.trip_id = p_trip_id and m.user_id = auth.uid()
  );
$$;

revoke all on function public.can_access_trip(uuid) from public;
grant execute on function public.can_access_trip(uuid) to anon, authenticated;

-- Backfill travelers -> trip_members rows ------------------------------
insert into public.trip_members (trip_id, display_name)
select t.id, traveler
from public.trips t,
     unnest(t.travelers) as traveler
where coalesce(array_length(t.travelers, 1), 0) > 0
  and not exists (
    select 1 from public.trip_members m
    where m.trip_id = t.id
      and m.user_id is null
      and lower(m.display_name) = lower(traveler)
  );

alter table public.trips drop column if exists travelers;

-- Rewrite RLS on trips --------------------------------------------------
drop policy if exists "trips owner read"   on public.trips;
drop policy if exists "trips owner write"  on public.trips;
drop policy if exists "trips owner update" on public.trips;
drop policy if exists "trips owner delete" on public.trips;

create policy "trips member read"
  on public.trips for select
  using (public.can_access_trip(id));

create policy "trips owner insert"
  on public.trips for insert
  with check (owner_id = auth.uid());

create policy "trips member update"
  on public.trips for update
  using (public.can_access_trip(id))
  with check (public.can_access_trip(id));

create policy "trips owner delete"
  on public.trips for delete
  using (owner_id = auth.uid());

-- Rewrite RLS on trip_items --------------------------------------------
drop policy if exists "trip_items owner read"   on public.trip_items;
drop policy if exists "trip_items owner write"  on public.trip_items;
drop policy if exists "trip_items owner update" on public.trip_items;
drop policy if exists "trip_items owner delete" on public.trip_items;

create policy "trip_items member read"
  on public.trip_items for select
  using (public.can_access_trip(trip_id));

create policy "trip_items member insert"
  on public.trip_items for insert
  with check (public.can_access_trip(trip_id));

create policy "trip_items member update"
  on public.trip_items for update
  using (public.can_access_trip(trip_id))
  with check (public.can_access_trip(trip_id));

create policy "trip_items member delete"
  on public.trip_items for delete
  using (public.can_access_trip(trip_id));

-- Rewrite RLS on food_places -------------------------------------------
drop policy if exists "food_places_select" on public.food_places;
drop policy if exists "food_places_insert" on public.food_places;
drop policy if exists "food_places_update" on public.food_places;
drop policy if exists "food_places_delete" on public.food_places;

create policy "food_places_select" on public.food_places for select
  using (public.can_access_trip(trip_id));

create policy "food_places_insert" on public.food_places for insert
  with check (public.can_access_trip(trip_id));

create policy "food_places_update" on public.food_places for update
  using (public.can_access_trip(trip_id))
  with check (public.can_access_trip(trip_id));

create policy "food_places_delete" on public.food_places for delete
  using (public.can_access_trip(trip_id));

-- Rewrite RLS on city_overrides ----------------------------------------
drop policy if exists "city_overrides_select" on public.city_overrides;
drop policy if exists "city_overrides_insert" on public.city_overrides;
drop policy if exists "city_overrides_update" on public.city_overrides;
drop policy if exists "city_overrides_delete" on public.city_overrides;

create policy "city_overrides_select" on public.city_overrides for select
  using (public.can_access_trip(trip_id));

create policy "city_overrides_insert" on public.city_overrides for insert
  with check (public.can_access_trip(trip_id));

create policy "city_overrides_update" on public.city_overrides for update
  using (public.can_access_trip(trip_id))
  with check (public.can_access_trip(trip_id));

create policy "city_overrides_delete" on public.city_overrides for delete
  using (public.can_access_trip(trip_id));

-- RLS on trip_members --------------------------------------------------
alter table public.trip_members enable row level security;

-- Anyone with access to the trip can see the member list.
create policy "trip_members read"
  on public.trip_members for select
  using (public.can_access_trip(trip_id));

-- Only the trip owner can add or rename members.
create policy "trip_members owner insert"
  on public.trip_members for insert
  with check (
    exists (
      select 1 from public.trips t
      where t.id = trip_members.trip_id and t.owner_id = auth.uid()
    )
  );

create policy "trip_members owner update"
  on public.trip_members for update
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_members.trip_id and t.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trips t
      where t.id = trip_members.trip_id and t.owner_id = auth.uid()
    )
  );

-- Owner can remove anyone; a member may remove their own row (leave).
create policy "trip_members owner or self delete"
  on public.trip_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.trips t
      where t.id = trip_members.trip_id and t.owner_id = auth.uid()
    )
  );
