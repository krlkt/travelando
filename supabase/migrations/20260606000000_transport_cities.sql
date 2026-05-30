-- Transport items split into a city pair (drives the trip's "City" logic /
-- day segmentation) and a route pair (from_place/to_place: optional
-- station/airport waypoints used for map-view routing).
alter table public.trip_items
  add column from_city jsonb,
  add column to_city   jsonb;

-- Backfill: existing transport rows stored the arrival/departure city in the
-- place fields. Copy them into the new city columns so the City header keeps
-- working. Stations (from_place/to_place) are left intact.
update public.trip_items
  set from_city = from_place,
      to_city   = to_place
  where kind = 'transport';
