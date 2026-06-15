-- Mark an expense as "resolved": already paid by each member at the time, so
-- it is excluded from balance settlement. It still counts toward spending
-- totals and category breakdowns — only the "who owes whom" math skips it.
-- Defaults to false so existing rows keep their current settle behavior.

alter table public.expenses
  add column if not exists resolved boolean not null default false;
