-- day_plans: a row marks a single trip day as "planned enough" (done).
-- Presence of a (trip_id, day_key) row == that day is marked planned.
create table public.day_plans (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_key text not null check (day_key ~ '^\d{4}-\d{2}-\d{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, day_key)
);

create index on public.day_plans(trip_id);

alter table public.day_plans enable row level security;

create policy "day_plans_select" on public.day_plans for select
  using (
    exists (
      select 1 from public.trips
      where trips.id = day_plans.trip_id
        and trips.owner_id = auth.uid()
    )
  );

create policy "day_plans_insert" on public.day_plans for insert
  with check (
    exists (
      select 1 from public.trips
      where trips.id = day_plans.trip_id
        and trips.owner_id = auth.uid()
    )
  );

create policy "day_plans_update" on public.day_plans for update
  using (
    exists (
      select 1 from public.trips
      where trips.id = day_plans.trip_id
        and trips.owner_id = auth.uid()
    )
  );

create policy "day_plans_delete" on public.day_plans for delete
  using (
    exists (
      select 1 from public.trips
      where trips.id = day_plans.trip_id
        and trips.owner_id = auth.uid()
    )
  );

create trigger day_plans_updated_at
  before update on public.day_plans
  for each row execute function public.set_updated_at();
