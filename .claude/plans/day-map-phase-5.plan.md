# Plan: Day Map — Phase 5 (route line, proximity hints) + pin fixes

**Context:** Day Map v1 (Phases 1–4) shipped — a per-day map (MapLibre GL + MapTiler
basemap + Google Places pins) showing lodging, the day's scheduled route, and
food/activity wishlists, with tap-to-add-to-day. This plan covers the deferred
Phase 5 work **plus** two pin issues found in use.

**Do these in order. Part A is a bug and should land first — it affects every
session with the map open.**

---

## Existing files (orientation for a cold start)

| File | Role |
|---|---|
| `src/lib/trips/dayMapPoints.ts` | Pure `buildDayMapPoints()` → discriminated `DayMapPoint[]` (`lodging`/`scheduled`/`foodWish`/`activityWish`) + `unlocatedCount`. Has `.test.ts`. |
| `src/components/map/DayMapCanvas.tsx` | Imperative MapLibre wrapper (lazy, `ssr:false`). Creates `new maplibregl.Marker({ element, anchor:'center' })` per point, reconciles markers in `syncMarkers()`, `fitToPoints()` on change. |
| `src/components/map/markers/createMarkerElement.ts` | Builds the marker DOM (`<button class="dm-marker dm-marker--{kind}">`). |
| `src/components/map/day-map.css` | Marker styling. **Source of the jitter bug — see Part A.** |
| `src/components/trips/DayMap.tsx` | Orchestrator: builds points, theme, legend, show/hide wishlist, AddToDaySheet, `handleSelectPoint`. |
| `src/lib/map/style.ts` | `buildStyleUrl(theme)`, `isMapConfigured()`, MapTiler key. |
| `src/components/trips/TripDetail.tsx` | Timeline⇄Map toggle (`view` state) renders `<DayMap>`. |

Requires `NEXT_PUBLIC_MAPTILER_KEY` in `.env.local` to render the live basemap;
without it the map shows a graceful fallback.

---

## Part A — FIX: pins drift/jitter while zooming  ·  Priority: HIGH  ·  Small

### Root cause
`.dm-marker` is the element passed straight to `new maplibregl.Marker({ element })`.
MapLibre positions it by writing an inline `transform: translate(x,y)` every
move/zoom frame. `day-map.css` puts `transition: transform …` + `will-change:
transform` on that **same** element and a `transform: scale()` on `:hover`. So
every reposition gets *animated* — pins lag/slide during zoom and only settle at
rest (matches the reported "only correct at max zoom").

### Fix
The MapLibre-controlled root must have **no `transform` and no
`transition: transform`**. Move all hover/scale/lift effects onto an inner
wrapper.

1. **`createMarkerElement.ts`** — wrap the visual in an inner element so the
   root stays transform-free. New structure:
   ```html
   <button class="dm-marker dm-marker--{kind}">   <!-- MapLibre owns transform -->
     <span class="dm-marker__inner">              <!-- hover scale/lift + transition here -->
       <span class="dm-marker__pin">…</span>
       <!-- want pips -->
     </span>
   </button>
   ```
   Put the `aria-label`/`title` on the root button (unchanged); the click
   listener stays on the root.

2. **`day-map.css`** — remove `transform`, `transition: transform`,
   `will-change: transform` from `.dm-marker`. Re-point them at
   `.dm-marker__inner`:
   ```css
   .dm-marker__inner { transition: transform var(--duration-fast) var(--ease-out-expo); will-change: transform; }
   .dm-marker:hover .dm-marker__inner,
   .dm-marker:focus-visible .dm-marker__inner { transform: translateY(-2px) scale(1.06); }
   ```
   Keep the reduced-motion block but target `.dm-marker__inner`.

3. Confirm `anchor: 'center'` is still correct for the circular pins (it is —
   the pin's center sits on the coordinate). Lodging rounded-square also centers
   fine.

### Validate
- `pnpm build` green; open Map view, zoom in/out fast — pins stay pinned to their
  location with no slide/lag; hover still lifts the pin.

---

## Part B — Collision handling: cluster overlapping pins as "+N"  ·  Medium

**Problem:** stacked/very-close wishlist pins overlap into an unreadable pile;
icons appear to "stack vertically." Want: when pins collide at the current zoom,
collapse them into one cluster marker showing a count (e.g. `+3`); expanding
happens by zooming in (or tapping the cluster to open a small list).

**Approach — client-side clustering of the existing HTML markers** (keeps the
styled, interactive HTML markers; MapLibre's native GL clustering would force a
switch to GeoJSON circle/symbol layers and lose the custom markers + React
sheet flow):

1. Add `supercluster` (`pnpm add supercluster`) — the same lib MapLibre uses;
   efficient and zoom-aware.
2. In `DayMapCanvas`: build a Supercluster index from `points` (feed lng/lat +
   keep the `DayMapPoint` as feature props). On `move`/`zoom`/`load`, query
   `getClusters(bbox, zoom)` and reconcile markers:
   - **Cluster feature** → render a cluster marker (`createClusterElement(count)`)
     styled like a neutral pill with `+N`. Click → `getClusterExpansionZoom()`
     and `easeTo` to expand (Phase-5-minimal), or open a small list sheet of the
     clustered points (nicer; can be a fast follow).
   - **Leaf feature** → render the normal `createMarkerElement(point)`.
   - Reconcile by stable id (cluster id vs point id) the same way `syncMarkers()`
     already does; debounce the query to `moveend`/`zoomend` to avoid churn.
3. **Keep `lodging` and `scheduled` (route) pins unclustered** — they're the
   anchors and the numbered route must stay legible. Cluster **only** wishlist
   pins (`foodWish`/`activityWish`). Partition before indexing.
4. `createClusterElement.ts` + CSS: `.dm-cluster` pill, tabular-nums, dashed
   accent to read as "more wishes here," sized slightly larger than a wish pin.

**Note:** clustering must be re-run on viewport change, so `DayMapCanvas` needs a
`moveend`/`zoomend` handler (it currently only syncs on `points` change). Store
the supercluster index in a ref; rebuild it only when `points` change, re-query
on viewport change.

### Validate
- Two wishes a few meters apart show one `+2` cluster when zoomed out; zooming in
  splits them to individual pins; route + lodging pins never cluster.

---

## Part C — Phase 5 proper: route line + proximity hints  ·  Medium

### C1. Time-ordered route polyline
- The literal day route: connect `scheduled` points in `order` sequence (already
  carried on `ScheduledMapPoint`). Optionally start the line at `lodging` if it
  makes sense (start of day) — decide during build; simplest v1 is scheduled-only.
- Render as a GL line layer (a real source/layer, not a marker): add a GeoJSON
  `LineString` source + `line` layer on map `load`; update its data in the points
  effect. Style with `--kind-activity`/a route token, ~3px, rounded caps, subtle
  opacity so markers stay dominant. This coexists fine with HTML markers.
- Reduced-motion: no animated dash; static line.

### C2. Proximity assist (non-committal hints)
- For each wishlist pin, compute straight-line (haversine) distance to the
  nearest scheduled stop and/or lodging. Add a tiny `lib/map/distance.ts`
  (`haversineMeters(a,b)`) — pure + unit-tested.
- In the wishlist **AddToDaySheet** (already exists in `DayMap.tsx`), show
  "~450 m from your plan · ~6 min walk" (rough walk = distance ÷ 80 m/min).
- Optional visual: emphasize wishlist pins within a walkable threshold
  (e.g. ≤ 800 m) of the route/lodging — e.g. solid-ish accent vs. faded for far
  ones — so "what's near today's plan" reads at a glance. Keep it a *hint*; never
  reorder or auto-add.
- **Explicitly out of scope:** real routing/turn-by-turn, travel-time matrices,
  auto-optimization of the itinerary. Hints only.

### Validate
- `distance.test.ts` passes (known city pairs within tolerance).
- Route line connects stops in time order and redraws when a wish is added to the
  day (Phase 4 loop).
- Sheet shows distance/walk estimate; far wishes visibly de-emphasized.

---

## Suggested order & sizing
1. **Part A** (bug, HIGH) — small, do first.
2. **Part B** (clustering / `+N`) — medium.
3. **Part C1** (route line) — small–medium.
4. **Part C2** (proximity hints) — medium.

## Cross-cutting checks
- Keep `maplibre-gl` (+ `supercluster`) lazy: still only reached via the
  `dynamic(ssr:false)` import in `DayMap.tsx`. Verify the trip page first-load JS
  is unchanged after adding supercluster (it should ride the same async chunk).
- `pnpm tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, `pnpm build` all green.
- Test at 320 / 768 / 1024 / 1440; verify touch tap on markers/clusters.

## Risks
| Risk | Mitigation |
|---|---|
| Clustering churn on every frame | Index in a ref, re-query only on `moveend`/`zoomend`, debounce |
| Route line obscures markers | Lower opacity, thin width, draw line layer beneath markers |
| Mixing GL layers (line/cluster) with HTML markers | Line = GL layer (fine); clustering stays HTML via supercluster query — don't convert markers to GL |
| Sparse coords (manual places) | Existing "N items have no location" affordance already covers it |
