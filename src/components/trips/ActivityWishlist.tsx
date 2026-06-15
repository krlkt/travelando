'use client';

import { useMemo, useRef, useState } from 'react';
import { CalendarCheck, MapPinned, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ActivityPlaceSheet } from './ActivityPlaceSheet';
import { WantLevel } from './WantLevel';
import { useTrips } from '@/lib/trips/context';
import { deriveCitiesByDay, foodPlaceCitiesForDay } from '@/lib/trips/cities';
import { isPlaceInTimeline } from '@/lib/trips/wishlistStatus';
import { toast } from 'sonner';
import type { ActivityPlace, Trip } from '@/lib/trips/types';
import { PlaceAddressLink } from '@/components/places/PlaceAddressLink';

interface ActivityWishlistProps {
  trip: Trip;
  dayKey?: string;
}

export function ActivityWishlist({ trip, dayKey }: ActivityWishlistProps) {
  const { activityPlaces, cityOverrides, removeActivityPlace, extrasStatus } =
    useTrips();
  const tripId = trip.id;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<ActivityPlace | null>(null);
  const [activeCity, setActiveCity] = useState<{
    cityLabel: string;
    cityPlaceId?: string;
  } | null>(null);

  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const pendingDeletes = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const placesForTrip = activityPlaces[tripId];
  // Only the first load (no cached data yet) shows skeletons; revisits keep the
  // activities already on screen.
  const isLoading =
    placesForTrip === undefined && extrasStatus[tripId] === 'loading';

  const places = useMemo(() => placesForTrip ?? [], [placesForTrip]);

  // Places already represented by a timeline item (matched by location).
  const plannedIds = useMemo(
    () =>
      new Set(
        places.filter((p) => isPlaceInTimeline(p, trip.items)).map((p) => p.id),
      ),
    [places, trip.items],
  );

  const cities = useMemo(() => {
    if (dayKey) {
      return foodPlaceCitiesForDay(trip, cityOverrides[tripId] ?? [], dayKey);
    }
    const buckets = deriveCitiesByDay(trip, cityOverrides[tripId] ?? []);
    const seen = new Set<string>();
    const result: Array<{ cityLabel: string; cityPlaceId?: string }> = [];
    for (const bucket of [...buckets.values()].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    )) {
      for (const seg of bucket.segments) {
        const key = seg.cityPlaceId ?? seg.cityLabel;
        if (!seen.has(key)) {
          seen.add(key);
          result.push({
            cityLabel: seg.cityLabel,
            cityPlaceId: seg.cityPlaceId,
          });
        }
      }
    }
    return result;
  }, [trip, cityOverrides, tripId, dayKey]);

  const grouped = useMemo(() => {
    const byCity = new Map<string, ActivityPlace[]>();
    for (const city of cities) {
      const key = city.cityPlaceId ?? city.cityLabel;
      byCity.set(key, []);
    }
    for (const place of places) {
      const key = place.cityPlaceId ?? place.cityLabel;
      if (!byCity.has(key)) byCity.set(key, []);
      byCity.get(key)!.push(place);
    }
    // Places already in the timeline sink to the bottom; otherwise highest want
    // level first. Array.sort is stable, so ties keep their original order.
    for (const cityPlaces of byCity.values()) {
      cityPlaces.sort((a, b) => {
        const aPlanned = plannedIds.has(a.id);
        const bPlanned = plannedIds.has(b.id);
        if (aPlanned !== bPlanned) return aPlanned ? 1 : -1;
        return (b.wantLevel ?? 0) - (a.wantLevel ?? 0);
      });
    }
    return byCity;
  }, [places, cities, plannedIds]);

  function openAdd(city: { cityLabel: string; cityPlaceId?: string }) {
    setEditingPlace(null);
    setActiveCity(city);
    setSheetOpen(true);
  }

  function openEdit(place: ActivityPlace) {
    setEditingPlace(place);
    setActiveCity({
      cityLabel: place.cityLabel,
      cityPlaceId: place.cityPlaceId,
    });
    setSheetOpen(true);
  }

  function handleDelete(place: ActivityPlace) {
    setDeletingIds((prev) => new Set([...prev, place.id]));

    const timeout = setTimeout(async () => {
      pendingDeletes.current.delete(place.id);
      try {
        await removeActivityPlace(tripId, place.id);
      } catch {
        toast.error("Couldn't remove activity");
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(place.id);
          return next;
        });
      }
    }, 4000);

    pendingDeletes.current.set(place.id, timeout);

    toast(`${place.name} removed`, {
      duration: 4000,
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(pendingDeletes.current.get(place.id));
          pendingDeletes.current.delete(place.id);
          setDeletingIds((prev) => {
            const next = new Set(prev);
            next.delete(place.id);
            return next;
          });
        },
      },
    });
  }

  return (
    <div className="border-border/60 bg-card rounded-[var(--radius-lg)] border">
      <div className="border-border/40 flex items-center gap-2 border-b px-4 py-3">
        <MapPinned className="text-muted-foreground size-4" />
        <span className="text-sm font-medium">Activity wishlist</span>
      </div>

      <div className="divide-border/30 max-h-[60vh] divide-y overflow-y-auto">
        {cities.map((city) => {
          const cityKey = city.cityPlaceId ?? city.cityLabel;
          const cityPlaces = grouped.get(cityKey) ?? [];
          const visiblePlaces = cityPlaces.filter(
            (p) => !deletingIds.has(p.id),
          );

          return (
            <div key={cityKey} className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-muted-foreground/70 text-[10px] tracking-[0.14em] uppercase">
                  {city.cityLabel}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openAdd(city)}
                  aria-label={`Add activity in ${city.cityLabel}`}
                  className="text-muted-foreground hover:text-foreground -mr-1 size-6"
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>

              {isLoading ? (
                <ul className="space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </ul>
              ) : visiblePlaces.length === 0 ? (
                <p className="text-muted-foreground/60 text-xs">
                  No activities yet.
                </p>
              ) : (
                <ul className="space-y-1">
                  {visiblePlaces.map((place) => (
                    <li
                      key={place.id}
                      className="group flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <PlaceAddressLink
                          place={{
                            label: place.name,
                            address: place.address,
                            lat: place.lat,
                            lng: place.lng,
                            placeId: place.placeId,
                          }}
                          className="block max-w-full min-w-0"
                        >
                          <span className="block truncate text-sm font-medium">
                            {place.name}
                          </span>
                          {place.address && (
                            <span className="text-muted-foreground block truncate text-xs">
                              {place.address}
                            </span>
                          )}
                        </PlaceAddressLink>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {plannedIds.has(place.id) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                tabIndex={0}
                                aria-label="Already in your itinerary"
                                className="text-primary flex items-center"
                              >
                                <CalendarCheck className="size-3.5" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Already in your itinerary
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <WantLevel
                          mode="indicator"
                          variant="star"
                          value={place.wantLevel}
                        />
                        <div className="flex items-center gap-1 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-foreground size-6"
                            onClick={() => openEdit(place)}
                            aria-label={`Edit ${place.name}`}
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive size-6"
                            onClick={() => handleDelete(place)}
                            aria-label={`Remove ${place.name}`}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {activeCity && (
        <ActivityPlaceSheet
          tripId={tripId}
          cityLabel={activeCity.cityLabel}
          cityPlaceId={activeCity.cityPlaceId}
          item={editingPlace}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}
    </div>
  );
}
