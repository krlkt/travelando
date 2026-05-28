-- Link expenses to trip items and categorize them.
-- item_id is nullable: standalone expenses (no associated item) remain valid.
-- category defaults to 'other' so existing rows stay valid post-migration.

alter table public.expenses
  add column if not exists item_id uuid
    references public.trip_items(id) on delete set null;

alter table public.expenses
  add column if not exists category text not null default 'other'
    check (category in (
      'accommodation',
      'entertainment',
      'groceries',
      'restaurants',
      'shopping',
      'transport',
      'other'
    ));

create index if not exists expenses_item_idx
  on public.expenses (item_id);
