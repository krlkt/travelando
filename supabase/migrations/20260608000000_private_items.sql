-- Private timeline items
-- private_to_user_ids: NULL = public, non-null array = private to those auth UIDs only.

alter table public.trip_items
  add column if not exists private_to_user_ids uuid[];

-- GIN index for fast `= any(array)` lookups
create index if not exists trip_items_private_users_idx
  on public.trip_items using gin (private_to_user_ids)
  where private_to_user_ids is not null;

-- Rewrite all four item RLS policies ----------------------------------------
drop policy if exists "trip_items member read"   on public.trip_items;
drop policy if exists "trip_items member insert" on public.trip_items;
drop policy if exists "trip_items member update" on public.trip_items;
drop policy if exists "trip_items member delete" on public.trip_items;

-- SELECT: must be a trip member AND (item is public OR you are in the private list)
create policy "trip_items member read"
  on public.trip_items for select
  using (
    public.can_access_trip(trip_id)
    and (
      private_to_user_ids is null
      or auth.uid() = any(private_to_user_ids)
    )
  );

-- INSERT: same visibility check (can't create a private item you wouldn't be able to see)
create policy "trip_items member insert"
  on public.trip_items for insert
  with check (
    public.can_access_trip(trip_id)
    and (
      private_to_user_ids is null
      or auth.uid() = any(private_to_user_ids)
    )
  );

-- UPDATE: can only update items you can see
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
    and (
      private_to_user_ids is null
      or auth.uid() = any(private_to_user_ids)
    )
  );

-- DELETE: can only delete items you can see
create policy "trip_items member delete"
  on public.trip_items for delete
  using (
    public.can_access_trip(trip_id)
    and (
      private_to_user_ids is null
      or auth.uid() = any(private_to_user_ids)
    )
  );
