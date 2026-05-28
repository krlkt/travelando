-- Travelando: tricount-style shared expenses
-- Introduces `expenses` and `expense_shares`. An expense belongs to a trip,
-- is paid by a single member, and is split across one or more members using
-- one of three modes: equally / parts / amounts.

create extension if not exists "pgcrypto";

-- expenses --------------------------------------------------------------
create table if not exists public.expenses (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references public.trips(id) on delete cascade,
  title             text not null,
  amount            numeric(14, 2) not null check (amount > 0),
  currency          text not null check (char_length(currency) = 3),
  payer_member_id   uuid not null references public.trip_members(id) on delete restrict,
  spent_on          date not null,
  mode              text not null check (mode in ('equally', 'parts', 'amounts')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists expenses_trip_idx
  on public.expenses (trip_id, spent_on desc);

create index if not exists expenses_payer_idx
  on public.expenses (payer_member_id);

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

-- expense_shares --------------------------------------------------------
-- One row per included member.
-- mode = 'equally'  → value is NULL; share is amount / count(selected).
-- mode = 'parts'    → value is the integer multiplier (>= 1); share is
--                     (value / sum(values)) * amount.
-- mode = 'amounts'  → value is the fixed amount IF locked = true; otherwise
--                     value is NULL and the row gets the auto-distributed
--                     remainder = (amount − sum(locked values)) / count(unlocked).
create table if not exists public.expense_shares (
  id           uuid primary key default gen_random_uuid(),
  expense_id   uuid not null references public.expenses(id) on delete cascade,
  member_id    uuid not null references public.trip_members(id) on delete cascade,
  value        numeric(14, 4),
  locked       boolean not null default false,
  unique (expense_id, member_id)
);

create index if not exists expense_shares_expense_idx
  on public.expense_shares (expense_id);

-- RLS -------------------------------------------------------------------
alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;

create policy "expenses_select" on public.expenses for select
  using (public.can_access_trip(trip_id));

create policy "expenses_insert" on public.expenses for insert
  with check (public.can_access_trip(trip_id));

create policy "expenses_update" on public.expenses for update
  using (public.can_access_trip(trip_id))
  with check (public.can_access_trip(trip_id));

create policy "expenses_delete" on public.expenses for delete
  using (public.can_access_trip(trip_id));

create policy "expense_shares_select" on public.expense_shares for select
  using (exists (
    select 1 from public.expenses e
    where e.id = expense_shares.expense_id
      and public.can_access_trip(e.trip_id)
  ));

create policy "expense_shares_insert" on public.expense_shares for insert
  with check (exists (
    select 1 from public.expenses e
    where e.id = expense_shares.expense_id
      and public.can_access_trip(e.trip_id)
  ));

create policy "expense_shares_update" on public.expense_shares for update
  using (exists (
    select 1 from public.expenses e
    where e.id = expense_shares.expense_id
      and public.can_access_trip(e.trip_id)
  ))
  with check (exists (
    select 1 from public.expenses e
    where e.id = expense_shares.expense_id
      and public.can_access_trip(e.trip_id)
  ));

create policy "expense_shares_delete" on public.expense_shares for delete
  using (exists (
    select 1 from public.expenses e
    where e.id = expense_shares.expense_id
      and public.can_access_trip(e.trip_id)
  ));

-- Drop legacy per-item expense column. Per product decision, expenses are
-- no longer stored on trip items; users will re-enter their data via the
-- new dedicated expenses surface.
alter table public.trip_items drop column if exists expense;
