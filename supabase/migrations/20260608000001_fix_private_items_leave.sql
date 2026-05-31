-- Fix UPDATE policy: with check was too strict for the "leave" operation.
-- The using clause (pre-update check) already ensures only authorised members
-- can touch an item. The with check (post-update check) only needs to confirm
-- the item still belongs to a trip the caller can access — it must not also
-- require the caller to remain in private_to_user_ids, because that blocks the
-- intentional case where a member removes themselves from the private list.

drop policy if exists "trip_items member update" on public.trip_items;

create policy "trip_items member update"
  on public.trip_items for update
  using (
    public.can_access_trip(trip_id)
    and (
      private_to_user_ids is null
      or auth.uid() = any(private_to_user_ids)
    )
  )
  with check (
    public.can_access_trip(trip_id)
  );
