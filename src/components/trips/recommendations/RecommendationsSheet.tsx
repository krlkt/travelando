'use client';

import { useState } from 'react';
import { Sparkles, Star, Check, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useTrips } from '@/lib/trips/context';
import {
  activityCategoryLabel,
  foodCategoryLabel,
} from '@/lib/trips/categoryLabels';
import type {
  ActivityPlaceCategory,
  FoodPlaceCategory,
  Recommendation,
  TravelCompanion,
} from '@/lib/trips/types';

interface RecommendationsSheetProps {
  tripId: string;
  cityLabel: string;
  cityPlaceId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMPANION_OPTIONS: { value: TravelCompanion; label: string }[] = [
  { value: 'solo', label: 'Solo' },
  { value: 'partner', label: 'Partner' },
  { value: 'friends', label: 'Friends' },
  { value: 'family', label: 'Family' },
];

export function RecommendationsSheet({
  tripId,
  cityLabel,
  cityPlaceId,
  open,
  onOpenChange,
}: RecommendationsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:w-[460px]">
        {open && (
          <RecommendationsBody
            tripId={tripId}
            cityLabel={cityLabel}
            cityPlaceId={cityPlaceId}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface BodyProps {
  tripId: string;
  cityLabel: string;
  cityPlaceId?: string;
}

function RecommendationsBody({ tripId, cityLabel, cityPlaceId }: BodyProps) {
  const { addFoodPlace, addActivityPlace } = useTrips();

  const [interests, setInterests] = useState('');
  const [companions, setCompanions] = useState<TravelCompanion | ''>('');
  const [groupSize, setGroupSize] = useState('');
  const [ageRange, setAgeRange] = useState('');

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Recommendation[] | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const fetchIdeas = async () => {
    setLoading(true);
    setResults(null);
    try {
      const size = parseInt(groupSize, 10);
      const res = await fetch(`/api/trips/${tripId}/recommendations`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cityLabel,
          cityPlaceId,
          interests: interests.trim() || undefined,
          companions: companions || undefined,
          groupSize: Number.isFinite(size) && size > 0 ? size : undefined,
          ageRange: ageRange.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const reason =
          json.error === 'places_not_configured'
            ? 'Place search isn’t configured yet.'
            : 'Could not load ideas. Try again.';
        toast.error(reason);
        setResults([]);
        return;
      }
      setResults(json.data as Recommendation[]);
    } catch {
      toast.error('Could not load ideas. Try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (rec: Recommendation) => {
    // Optimistically mark as added; roll back on failure.
    setAdded((prev) => new Set(prev).add(rec.placeId));
    const base = {
      tripId,
      cityLabel,
      cityPlaceId,
      name: rec.name,
      address: rec.address,
      lat: rec.lat,
      lng: rec.lng,
      placeId: rec.placeId,
      notes: rec.reason,
    };
    try {
      if (rec.kind === 'food') {
        await addFoodPlace({
          ...base,
          category: rec.category as FoodPlaceCategory,
        });
      } else {
        await addActivityPlace({
          ...base,
          category: rec.category as ActivityPlaceCategory,
        });
      }
      toast.success(`Added ${rec.name} to wishlist`);
    } catch (err) {
      setAdded((prev) => {
        const next = new Set(prev);
        next.delete(rec.placeId);
        return next;
      });
      const message = err instanceof Error ? err.message : 'Add failed';
      toast.error(`Couldn’t add: ${message}`);
    }
  };

  return (
    <>
      <SheetTitle className="flex items-center gap-2">
        <Sparkles className="size-4 text-violet-500" aria-hidden />
        Discover ideas
      </SheetTitle>
      <SheetDescription>
        Must-dos in {cityLabel}, tuned to who you’re going with. Leave it blank
        for the all-time favourites.
      </SheetDescription>

      <div className="grid gap-3 px-4">
        <div className="grid gap-1.5">
          <Label htmlFor="rec-interests">What are you in the mood for?</Label>
          <Input
            id="rec-interests"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="ramen, temples, jazz bars…"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Going with</Label>
            <Select
              value={companions}
              onValueChange={(v) => setCompanions(v as TravelCompanion)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Anyone" />
              </SelectTrigger>
              <SelectContent>
                {COMPANION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rec-size">Group size</Label>
            <Input
              id="rec-size"
              type="number"
              min={1}
              value={groupSize}
              onChange={(e) => setGroupSize(e.target.value)}
              placeholder="—"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rec-age">Age range</Label>
          <Input
            id="rec-age"
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value)}
            placeholder="kids, 20s, 60+…"
          />
        </div>
        <Button onClick={fetchIdeas} disabled={loading} className="mt-1">
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-4" aria-hidden />
          )}
          {loading ? 'Finding the good stuff…' : 'Get ideas'}
        </Button>
      </div>

      <div className="mt-2 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4">
        {results !== null && results.length === 0 && !loading && (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No ideas yet for {cityLabel}. Try different interests.
          </p>
        )}
        <ul className="grid w-full min-w-0 gap-2">
          {results?.map((rec) => {
            const isAdded = added.has(rec.placeId);
            const categoryLabel =
              rec.kind === 'food'
                ? foodCategoryLabel(rec.category as FoodPlaceCategory)
                : activityCategoryLabel(rec.category as ActivityPlaceCategory);
            return (
              <li
                key={rec.placeId}
                className="bg-card w-full min-w-0 overflow-hidden rounded-lg border p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{rec.name}</p>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <Badge variant="muted" className="font-normal">
                        {categoryLabel}
                      </Badge>
                      {rec.rating != null && (
                        <span className="inline-flex items-center gap-0.5">
                          <Star
                            className="size-3 fill-amber-400 text-amber-400"
                            aria-hidden
                          />
                          {rec.rating.toFixed(1)}
                          {rec.userRatingCount != null && (
                            <span className="text-muted-foreground/70">
                              ({rec.userRatingCount.toLocaleString()})
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isAdded ? 'secondary' : 'default'}
                    disabled={isAdded}
                    onClick={() => handleAdd(rec)}
                    aria-label={`Add ${rec.name} to wishlist`}
                    className="shrink-0"
                  >
                    {isAdded ? (
                      <Check className="size-4" aria-hidden />
                    ) : (
                      <Plus className="size-4" aria-hidden />
                    )}
                    {isAdded ? 'Added' : 'Add'}
                  </Button>
                </div>
                {rec.reason && (
                  <p className="text-muted-foreground mt-2 text-sm break-words italic">
                    {rec.reason}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
