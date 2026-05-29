-- Travelando: fix trip creation failing with RLS on INSERT ... RETURNING
--
-- repository.create() issues `insert(...).select(...)`, which PostgREST sends
-- as a single `INSERT ... RETURNING`. The RETURNING clause re-applies the
-- SELECT policy to the freshly inserted row. The previous policy used
-- can_access_trip(id) — a STABLE SECURITY DEFINER helper that re-queries
-- public.trips by id. Inside the inserting statement that helper runs against
-- a snapshot that does not yet contain the new row, so it returns false and
-- the insert fails with:
--   "new row violates row-level security policy for table \"trips\""
-- even though the INSERT WITH CHECK and a later standalone SELECT both pass.
--
-- Fix: check the owner directly against the candidate row's own owner_id
-- column (which IS visible in RETURNING), and fall back to can_access_trip
-- only for the shared-member case. Member-visible trips always already exist,
-- so the same-statement snapshot issue never applies to that branch.

drop policy if exists "trips member read" on public.trips;

create policy "trips member read"
  on public.trips for select
  using (
    owner_id = auth.uid()
    or public.can_access_trip(id)
  );
