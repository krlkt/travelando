-- Prevent overlapping lodging items within a trip.
-- One lodging per night: enforce at DB level via gist exclusion on tstzrange.

create extension if not exists btree_gist;

alter table public.trip_items
  drop constraint if exists trip_items_lodging_no_overlap;

alter table public.trip_items
  add constraint trip_items_lodging_no_overlap
  exclude using gist (
    trip_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (kind = 'lodging' and ends_at is not null);
