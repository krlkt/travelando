-- place_details_cache.tier records how rich the cached blob is:
--   0 = basic fields (id/name/address/location)
--   1 = rich fields (rating, opening hours, photos, …) — billed at a higher
--       Google Places SKU.
-- A higher tier is a strict superset, so a basic request can always be served
-- from a rich row; only a rich request needs a tier-1 row.
alter table public.place_details_cache
  add column if not exists tier smallint not null default 0;
