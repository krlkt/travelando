-- food_places RLS predates collaborative trips: its policies still gate on
-- trips.owner_id = auth.uid(), so accepted trip members can't see or edit the
-- food wishlist (while activity_places already uses can_access_trip). Bring the
-- four policies in line with activity_places so members get the same access.

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
