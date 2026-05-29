-- activity_places: wishlist of activities/attractions per city (not scheduled)
create table public.activity_places (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  city_label text not null,
  city_place_id text,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  place_id text,
  notes text,
  category text check (category in ('sightseeing','museum','outdoor','entertainment','tour','shopping','nightlife','other')),
  want_level smallint check (want_level between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.activity_places(trip_id);
create index on public.activity_places(trip_id, city_place_id) where city_place_id is not null;

alter table public.activity_places enable row level security;

create policy "activity_places_select" on public.activity_places for select
  using (public.can_access_trip(trip_id));

create policy "activity_places_insert" on public.activity_places for insert
  with check (public.can_access_trip(trip_id));

create policy "activity_places_update" on public.activity_places for update
  using (public.can_access_trip(trip_id))
  with check (public.can_access_trip(trip_id));

create policy "activity_places_delete" on public.activity_places for delete
  using (public.can_access_trip(trip_id));

create trigger activity_places_updated_at
  before update on public.activity_places
  for each row execute function public.set_updated_at();
