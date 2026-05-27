'use client';

import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FoodPlaceSheet } from './FoodPlaceSheet';
import { useTrips } from '@/lib/trips/context';
import { deriveCitiesByDay } from '@/lib/trips/cities';
import { toast } from 'sonner';
import type { FoodPlace, Trip } from '@/lib/trips/types';

interface FoodWishlistProps {
  trip: Trip;
}

export function FoodWishlist({ trip }: FoodWishlistProps) {
  const { foodPlaces, cityOverrides, removeFoodPlace } = useTrips();
  const tripId = trip.id;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<FoodPlace | null>(null);
  const [activeCity, setActiveCity] = useState<{
    cityLabel: string;
    cityPlaceId?: string;
  } | null>(null);

  const places = foodPlaces[tripId] ?? [];

  const cities = useMemo(() => {
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
  }, [trip, cityOverrides, tripId]);

  const grouped = useMemo(() => {
    const byCity = new Map<string, FoodPlace[]>();
    for (const city of cities) {
      const key = city.cityPlaceId ?? city.cityLabel;
      byCity.set(key, []);
    }
    for (const place of places) {
      const key = place.cityPlaceId ?? place.cityLabel;
      if (!byCity.has(key)) byCity.set(key, []);
      byCity.get(key)!.push(place);
    }
    return byCity;
  }, [places, cities]);

  function openAdd(city: { cityLabel: string; cityPlaceId?: string }) {
    setEditingPlace(null);
    setActiveCity(city);
    setSheetOpen(true);
  }

  function openEdit(place: FoodPlace) {
    setEditingPlace(place);
    setActiveCity({
      cityLabel: place.cityLabel,
      cityPlaceId: place.cityPlaceId,
    });
    setSheetOpen(true);
  }

  async function handleDelete(place: FoodPlace) {
    try {
      await removeFoodPlace(tripId, place.id);
      toast.success('Place removed');
    } catch {
      toast.error("Couldn't remove place");
    }
  }

  return (
    <div className="border-border/60 bg-card rounded-[var(--radius-lg)] border">
      <div className="border-border/40 flex items-center gap-2 border-b px-4 py-3">
        <UtensilsCrossed className="text-muted-foreground size-4" />
        <span className="text-sm font-medium">Food wishlist</span>
      </div>

      <div className="divide-border/30 divide-y">
        {cities.map((city) => {
          const cityKey = city.cityPlaceId ?? city.cityLabel;
          const cityPlaces = grouped.get(cityKey) ?? [];

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
                  aria-label={`Add place in ${city.cityLabel}`}
                  className="text-muted-foreground hover:text-foreground -mr-1 size-6"
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>

              {cityPlaces.length === 0 ? (
                <p className="text-muted-foreground/60 text-xs">
                  No places yet.
                </p>
              ) : (
                <ul className="space-y-1">
                  {cityPlaces.map((place) => (
                    <li
                      key={place.id}
                      className="group flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {place.name}
                        </p>
                        {place.address && (
                          <p className="text-muted-foreground truncate text-xs">
                            {place.address}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
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
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {activeCity && (
        <FoodPlaceSheet
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
