-- food_places: wishlist of food/drink venues per city (not scheduled)
create table public.food_places (
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
  category text check (category in ('restaurant','cafe','bar','food','drink','other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.food_places(trip_id);
create index on public.food_places(trip_id, city_place_id) where city_place_id is not null;

alter table public.food_places enable row level security;

create policy "food_places_select" on public.food_places for select
  using (
    exists (
      select 1 from public.trips
      where trips.id = food_places.trip_id
        and trips.owner_id = auth.uid()
    )
  );

create policy "food_places_insert" on public.food_places for insert
  with check (
    exists (
      select 1 from public.trips
      where trips.id = food_places.trip_id
        and trips.owner_id = auth.uid()
    )
  );

create policy "food_places_update" on public.food_places for update
  using (
    exists (
      select 1 from public.trips
      where trips.id = food_places.trip_id
        and trips.owner_id = auth.uid()
    )
  );

create policy "food_places_delete" on public.food_places for delete
  using (
    exists (
      select 1 from public.trips
      where trips.id = food_places.trip_id
        and trips.owner_id = auth.uid()
    )
  );

create trigger food_places_updated_at
  before update on public.food_places
  for each row execute function public.set_updated_at();

-- city_overrides: manual per-day city override
create table public.city_overrides (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_key text not null check (day_key ~ '^\d{4}-\d{2}-\d{2}$'),
  city_label text not null,
  city_place_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, day_key)
);

create index on public.city_overrides(trip_id);

alter table public.city_overrides enable row level security;

create policy "city_overrides_select" on public.city_overrides for select
  using (
    exists (
      select 1 from public.trips
      where trips.id = city_overrides.trip_id
        and trips.owner_id = auth.uid()
    )
  );

create policy "city_overrides_insert" on public.city_overrides for insert
  with check (
    exists (
      select 1 from public.trips
      where trips.id = city_overrides.trip_id
        and trips.owner_id = auth.uid()
    )
  );

create policy "city_overrides_update" on public.city_overrides for update
  using (
    exists (
      select 1 from public.trips
      where trips.id = city_overrides.trip_id
        and trips.owner_id = auth.uid()
    )
  );

create policy "city_overrides_delete" on public.city_overrides for delete
  using (
    exists (
      select 1 from public.trips
      where trips.id = city_overrides.trip_id
        and trips.owner_id = auth.uid()
    )
  );

create trigger city_overrides_updated_at
  before update on public.city_overrides
  for each row execute function public.set_updated_at();

-- place_details_cache: caches Google Places Detail responses to minimize API spend
create table public.place_details_cache (
  place_id text primary key,
  data jsonb not null,
  cached_at timestamptz not null default now()
);

-- No RLS needed — this is a read-through cache keyed by public place_id
