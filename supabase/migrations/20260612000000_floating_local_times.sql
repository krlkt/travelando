-- Itinerary times are floating wall-clock values: "09:00" means 09:00 at the
-- place where the item happens, regardless of the viewer's device timezone.
-- timestamptz stored an absolute instant instead, so times shifted when the
-- planner travelled (entered from Germany, viewed in Indonesia → +5/6h drift).
--
-- All existing rows were entered from a device on Europe/Berlin time, so
-- `at time zone 'Europe/Berlin'` recovers exactly the wall time that was typed
-- (DST handled per-row). New rows are stored as typed, with no conversion.

-- The lodging exclusion constraint depends on the column type; rebuild it.
alter table public.trip_items
  drop constraint if exists trip_items_lodging_no_overlap;

alter table public.trip_items
  alter column starts_at type timestamp using (starts_at at time zone 'Europe/Berlin'),
  alter column ends_at   type timestamp using (ends_at   at time zone 'Europe/Berlin');

alter table public.trip_items
  add constraint trip_items_lodging_no_overlap
  exclude using gist (
    trip_id with =,
    tsrange(starts_at, ends_at, '[)') with &&
  )
  where (kind = 'lodging' and ends_at is not null);

-- Trip start/end are calendar dates, not instants.
alter table public.trips
  alter column start_date type date using (start_date at time zone 'Europe/Berlin')::date,
  alter column end_date   type date using (end_date   at time zone 'Europe/Berlin')::date;
