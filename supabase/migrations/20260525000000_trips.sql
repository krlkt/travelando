-- Travelando: trips + trip_items schema
-- Requires anonymous sign-ins enabled in Supabase Auth (Auth → Providers → Anonymous).
-- After applying, every visitor gets an auth.uid() and owns the rows they create.

create extension if not exists "pgcrypto";

-- trips ------------------------------------------------------------------
create table if not exists public.trips (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title           text not null,
  destination     text not null,
  cover_image     text,
  cover_gradient  text not null,
  start_date      timestamptz not null,
  end_date        timestamptz not null,
  travelers       text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists trips_owner_start_idx
  on public.trips (owner_id, start_date desc);

-- trip_items -------------------------------------------------------------
create table if not exists public.trip_items (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid not null references public.trips(id) on delete cascade,
  kind            text not null check (kind in ('transport','activity','lodging','meal','note')),
  title           text not null,
  starts_at       timestamptz not null,
  ends_at         timestamptz,
  from_place      jsonb,
  to_place        jsonb,
  transport_mode  text,
  notes           text,
  expense         jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists trip_items_trip_starts_idx
  on public.trip_items (trip_id, starts_at);

-- updated_at trigger -----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

drop trigger if exists trip_items_set_updated_at on public.trip_items;
create trigger trip_items_set_updated_at
  before update on public.trip_items
  for each row execute function public.set_updated_at();

-- RLS --------------------------------------------------------------------
alter table public.trips enable row level security;
alter table public.trip_items enable row level security;

drop policy if exists "trips owner read"   on public.trips;
drop policy if exists "trips owner write"  on public.trips;
drop policy if exists "trips owner update" on public.trips;
drop policy if exists "trips owner delete" on public.trips;

create policy "trips owner read"
  on public.trips for select
  using (owner_id = auth.uid());

create policy "trips owner write"
  on public.trips for insert
  with check (owner_id = auth.uid());

create policy "trips owner update"
  on public.trips for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "trips owner delete"
  on public.trips for delete
  using (owner_id = auth.uid());

drop policy if exists "trip_items owner read"   on public.trip_items;
drop policy if exists "trip_items owner write"  on public.trip_items;
drop policy if exists "trip_items owner update" on public.trip_items;
drop policy if exists "trip_items owner delete" on public.trip_items;

create policy "trip_items owner read"
  on public.trip_items for select
  using (exists (
    select 1 from public.trips t
    where t.id = trip_items.trip_id and t.owner_id = auth.uid()
  ));

create policy "trip_items owner write"
  on public.trip_items for insert
  with check (exists (
    select 1 from public.trips t
    where t.id = trip_items.trip_id and t.owner_id = auth.uid()
  ));

create policy "trip_items owner update"
  on public.trip_items for update
  using (exists (
    select 1 from public.trips t
    where t.id = trip_items.trip_id and t.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.trips t
    where t.id = trip_items.trip_id and t.owner_id = auth.uid()
  ));

create policy "trip_items owner delete"
  on public.trip_items for delete
  using (exists (
    select 1 from public.trips t
    where t.id = trip_items.trip_id and t.owner_id = auth.uid()
  ));
