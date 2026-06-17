'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { notFound } from 'next/navigation';
import { Heart, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrips } from '@/lib/trips/context';
import { usePersistedCity } from '@/hooks/usePersistedCity';
import { buildWishlistCityKey } from '@/lib/trips/wishlistCityStorage';
import { deriveCitiesByDay } from '@/lib/trips/cities';
import { isPlaceInTimeline } from '@/lib/trips/wishlistStatus';
import {
  mergeWishlist,
  type WishlistEntry,
  type WishlistKind,
} from '@/lib/trips/wishlistItems';
import {
  DEFAULT_WISHLIST_VIEW,
  entryCityKey,
  filterAndSortWishlist,
  type WishlistKindFilter,
  type WishlistPlanFilter,
  type WishlistSort,
} from '@/lib/trips/wishlistView';
import type { ActivityPlace, FoodPlace } from '@/lib/trips/types';
import { ActivityPlaceSheet } from '@/components/trips/ActivityPlaceSheet';
import { FoodPlaceSheet } from '@/components/trips/FoodPlaceSheet';
import { WishlistCard } from './WishlistCard';
import { WishlistFilters } from './WishlistFilters';

interface WishlistsPageProps {
  tripId: string;
}

interface CityRef {
  key: string;
  label: string;
  cityLabel: string;
  cityPlaceId?: string;
}

const DELETE_GRACE_MS = 4000;

/** Trip-wide city list in itinerary order, deduped by place id / label. */
function useTripCities(tripId: string): CityRef[] {
  const { getTrip, cityOverrides } = useTrips();
  const trip = getTrip(tripId);
  return useMemo(() => {
    if (!trip) return [];
    const buckets = deriveCitiesByDay(trip, cityOverrides[tripId] ?? []);
    const seen = new Set<string>();
    const result: CityRef[] = [];
    for (const bucket of [...buckets.values()].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    )) {
      for (const seg of bucket.segments) {
        const key = seg.cityPlaceId ?? seg.cityLabel;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({
          key,
          label: seg.cityLabel,
          cityLabel: seg.cityLabel,
          cityPlaceId: seg.cityPlaceId,
        });
      }
    }
    return result;
  }, [trip, cityOverrides, tripId]);
}

export function WishlistsPage({ tripId }: WishlistsPageProps) {
  const {
    getTrip,
    foodPlaces,
    activityPlaces,
    loadTripExtras,
    extrasStatus,
    removeFoodPlace,
    removeActivityPlace,
  } = useTrips();
  const trip = getTrip(tripId);

  useEffect(() => {
    loadTripExtras(tripId).catch(() => {
      toast.error("Couldn't load your wishlist. Try again.");
    });
  }, [tripId, loadTripExtras]);

  const cities = useTripCities(tripId);
  const cityKeys = useMemo(() => cities.map((c) => c.key), [cities]);

  // The wishlist is always scoped to a single city; the last-viewed one is
  // persisted per trip and restored on return.
  const [cityKey, setCityKey] = usePersistedCity(
    buildWishlistCityKey(tripId),
    cities[0]?.key ?? '',
    cityKeys,
  );
  const activeCity = useMemo(
    () => cities.find((c) => c.key === cityKey) ?? cities[0] ?? null,
    [cities, cityKey],
  );

  // Secondary filter + sort state.
  const [kind, setKind] = useState<WishlistKindFilter>(
    DEFAULT_WISHLIST_VIEW.kind,
  );
  const [planFilter, setPlanFilter] = useState<WishlistPlanFilter>(
    DEFAULT_WISHLIST_VIEW.planFilter,
  );
  const [sort, setSort] = useState<WishlistSort>(DEFAULT_WISHLIST_VIEW.sort);
  const [ratingById, setRatingById] = useState<Map<string, number>>(new Map());

  // Edit / add sheet state.
  const [sheetKind, setSheetKind] = useState<WishlistKind | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetCity, setSheetCity] = useState<CityRef | null>(null);
  const [editingFood, setEditingFood] = useState<FoodPlace | null>(null);
  const [editingActivity, setEditingActivity] = useState<ActivityPlace | null>(
    null,
  );

  // Optimistic delete with undo.
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const pendingDeletes = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const food = useMemo(() => foodPlaces[tripId] ?? [], [foodPlaces, tripId]);
  const activities = useMemo(
    () => activityPlaces[tripId] ?? [],
    [activityPlaces, tripId],
  );

  const entries = useMemo(
    () => mergeWishlist(food, activities),
    [food, activities],
  );

  const isLoading =
    foodPlaces[tripId] === undefined &&
    activityPlaces[tripId] === undefined &&
    extrasStatus[tripId] === 'loading';

  const plannedIds = useMemo(() => {
    if (!trip) return new Set<string>();
    return new Set(
      entries.filter((e) => isPlaceInTimeline(e, trip.items)).map((e) => e.id),
    );
  }, [entries, trip]);

  const visible = useMemo(
    () =>
      filterAndSortWishlist(entries, {
        kind,
        categories: null,
        cityKey: activeCity?.key ?? null,
        minWantLevel: 0,
        planFilter,
        sort,
        plannedIds,
        ratingById,
      }).filter((e) => !deletingIds.has(e.id)),
    [
      entries,
      kind,
      activeCity,
      planFilter,
      sort,
      plannedIds,
      ratingById,
      deletingIds,
    ],
  );

  const handleRating = useCallback((id: string, rating: number) => {
    setRatingById((prev) => {
      if (prev.get(id) === rating) return prev;
      const next = new Map(prev);
      next.set(id, rating);
      return next;
    });
  }, []);

  const closeSheet = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      setEditingFood(null);
      setEditingActivity(null);
    }
  }, []);

  function openAdd(addKind: WishlistKind) {
    if (!activeCity) return;
    setSheetCity(activeCity);
    setSheetKind(addKind);
    setEditingFood(null);
    setEditingActivity(null);
    setSheetOpen(true);
  }

  function openEdit(entry: WishlistEntry) {
    const city: CityRef = {
      key: entryCityKey(entry),
      label: entry.cityLabel,
      cityLabel: entry.cityLabel,
      cityPlaceId: entry.cityPlaceId,
    };
    setSheetCity(city);
    setSheetKind(entry.kind);
    if (entry.kind === 'food') {
      setEditingFood(food.find((f) => f.id === entry.id) ?? null);
      setEditingActivity(null);
    } else {
      setEditingActivity(activities.find((a) => a.id === entry.id) ?? null);
      setEditingFood(null);
    }
    setSheetOpen(true);
  }

  function handleDelete(entry: WishlistEntry) {
    setDeletingIds((prev) => new Set([...prev, entry.id]));

    const remove = () =>
      entry.kind === 'food'
        ? removeFoodPlace(tripId, entry.id)
        : removeActivityPlace(tripId, entry.id);

    const timeout = setTimeout(async () => {
      pendingDeletes.current.delete(entry.id);
      try {
        await remove();
      } catch {
        toast.error("Couldn't remove place");
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(entry.id);
          return next;
        });
      }
    }, DELETE_GRACE_MS);

    pendingDeletes.current.set(entry.id, timeout);

    toast(`${entry.name} removed`, {
      duration: DELETE_GRACE_MS,
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(pendingDeletes.current.get(entry.id));
          pendingDeletes.current.delete(entry.id);
          setDeletingIds((prev) => {
            const next = new Set(prev);
            next.delete(entry.id);
            return next;
          });
        },
      },
    });
  }

  if (!trip) notFound();

  const totalVisible = visible.length;
  const plannedCount = visible.filter((e) => plannedIds.has(e.id)).length;

  return (
    <div className="from-background via-background to-secondary/30 relative min-h-svh bg-gradient-to-b">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[40svh]"
        style={{
          background: trip.coverGradient,
          opacity: 0.16,
          maskImage: 'linear-gradient(to bottom, black 35%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 35%, transparent)',
        }}
      />
      <div className="relative mx-auto max-w-[var(--container-page)] px-4 pt-8 pb-28 sm:px-6 md:px-10">
        <header className="mb-5">
          <p className="text-muted-foreground/70 flex items-center gap-1.5 text-[11px] tracking-[0.16em] uppercase">
            <Heart className="size-3.5" /> Wishlist
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {activeCity ? activeCity.label : 'Places you want to go'}
          </h1>
          {!isLoading && (
            <p className="text-muted-foreground mt-1 text-sm">
              {totalVisible} {totalVisible === 1 ? 'place' : 'places'}
              {plannedCount > 0 && ` · ${plannedCount} in your plan`}
            </p>
          )}
        </header>

        {cities.length > 0 && activeCity && (
          <WishlistFilters
            cities={cities.map((c) => ({ key: c.key, label: c.label }))}
            cityKey={activeCity.key}
            onCity={setCityKey}
            kind={kind}
            onKind={setKind}
            planFilter={planFilter}
            onPlanFilter={setPlanFilter}
            sort={sort}
            onSort={setSort}
          />
        )}

        <div className="mt-5">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-[var(--radius-lg)]" />
              ))}
            </div>
          ) : activeCity ? (
            <section aria-labelledby="wishlist-city">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2
                  id="wishlist-city"
                  className="text-muted-foreground/70 text-[11px] font-medium tracking-[0.14em] uppercase"
                >
                  {activeCity.label}
                </h2>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground h-7 gap-1 px-2 text-xs"
                    onClick={() => openAdd('food')}
                  >
                    <Plus className="size-3.5" /> Food
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground h-7 gap-1 px-2 text-xs"
                    onClick={() => openAdd('activity')}
                  >
                    <Plus className="size-3.5" /> Activity
                  </Button>
                </div>
              </div>

              {visible.length === 0 ? (
                <p className="text-muted-foreground/60 text-xs">
                  Nothing here yet.
                </p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {visible.map((entry) => (
                    <WishlistCard
                      key={entry.id}
                      entry={entry}
                      inPlan={plannedIds.has(entry.id)}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onRating={handleRating}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : (
            <p className="text-muted-foreground/70 text-sm">
              Add transport or lodging to your trip first, then collect places
              to visit here.
            </p>
          )}
        </div>
      </div>

      {sheetKind === 'food' && sheetCity && (
        <FoodPlaceSheet
          tripId={tripId}
          cityLabel={sheetCity.cityLabel}
          cityPlaceId={sheetCity.cityPlaceId}
          item={editingFood}
          open={sheetOpen}
          onOpenChange={closeSheet}
        />
      )}
      {sheetKind === 'activity' && sheetCity && (
        <ActivityPlaceSheet
          tripId={tripId}
          cityLabel={sheetCity.cityLabel}
          cityPlaceId={sheetCity.cityPlaceId}
          item={editingActivity}
          open={sheetOpen}
          onOpenChange={closeSheet}
        />
      )}
    </div>
  );
}
