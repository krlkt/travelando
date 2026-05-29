-- want_level: how badly you want to try a food place (1-5), optional
alter table public.food_places
  add column want_level smallint check (want_level between 1 and 5);
