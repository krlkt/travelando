-- Travelando: settlements for the Balances tab.
-- A settlement is a recorded money transfer between two trip members in a
-- single currency. The Balances math nets it into per-currency `paid` for the
-- sender and `owed` for the receiver, closing or partially closing a debt.

create extension if not exists "pgcrypto";

create table if not exists public.settlements (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references public.trips(id) on delete cascade,
  from_member_id    uuid not null references public.trip_members(id) on delete restrict,
  to_member_id      uuid not null references public.trip_members(id) on delete restrict,
  amount            numeric(14, 2) not null check (amount > 0),
  currency          text not null check (char_length(currency) = 3),
  settled_on        date not null,
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (from_member_id <> to_member_id)
);

create index if not exists settlements_trip_idx
  on public.settlements (trip_id, settled_on desc);

create index if not exists settlements_from_idx
  on public.settlements (from_member_id);

create index if not exists settlements_to_idx
  on public.settlements (to_member_id);

drop trigger if exists settlements_set_updated_at on public.settlements;
create trigger settlements_set_updated_at
  before update on public.settlements
  for each row execute function public.set_updated_at();

alter table public.settlements enable row level security;

create policy "settlements_select" on public.settlements for select
  using (public.can_access_trip(trip_id));

create policy "settlements_insert" on public.settlements for insert
  with check (public.can_access_trip(trip_id));

create policy "settlements_update" on public.settlements for update
  using (public.can_access_trip(trip_id))
  with check (public.can_access_trip(trip_id));

create policy "settlements_delete" on public.settlements for delete
  using (public.can_access_trip(trip_id));
