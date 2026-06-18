'use client';

import { useEffect } from 'react';
import { CalendarCheck, CalendarPlus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PlaceAddressLink } from '@/components/places/PlaceAddressLink';
import {
  OpenStatePill,
  PlacePhoto,
  PriceLevel,
  RatingBadge,
} from '@/components/places/PlaceDetailBits';
import { WantLevel } from '@/components/trips/WantLevel';
import { usePlaceDetails } from '@/hooks/usePlaceDetails';
import { openStateNow } from '@/lib/places/openingHours';
import {
  wishlistCategoryLabel,
  type WishlistEntry,
} from '@/lib/trips/wishlistItems';
import { cn } from '@/lib/utils';

interface WishlistCardProps {
  entry: WishlistEntry;
  inPlan: boolean;
  onEdit: (entry: WishlistEntry) => void;
  onDelete: (entry: WishlistEntry) => void;
  /** Opens the day picker to schedule this place onto the timeline. */
  onAddToTimeline: (entry: WishlistEntry) => void;
  /** Reports the loaded Google rating upward so the page can sort by it. */
  onRating?: (id: string, rating: number) => void;
  /** Briefly ringed when its map pin was tapped (selection sync). */
  highlighted?: boolean;
}

/**
 * One enriched wishlist place. Synchronous fields (name, category, want level,
 * address) render immediately; Google details (rating, price, open-now, photo)
 * stream in via {@link usePlaceDetails} once available. Actions sit in a
 * hover/focus-revealed cluster so the resting card stays calm.
 */
export function WishlistCard({
  entry,
  inPlan,
  onEdit,
  onDelete,
  onAddToTimeline,
  onRating,
  highlighted,
}: WishlistCardProps) {
  const { detail } = usePlaceDetails(entry.placeId);
  const categoryLabel = wishlistCategoryLabel(entry);
  const rating = detail?.rating;

  useEffect(() => {
    if (rating != null && onRating) onRating(entry.id, rating);
  }, [rating, entry.id, onRating]);

  const openState = detail?.openingHours
    ? openStateNow(detail.openingHours, detail.utcOffsetMinutes)
    : 'unknown';

  return (
    <article
      id={`wish-${entry.id}`}
      className={cn(
        'group border-border/60 bg-card relative flex scroll-mt-24 gap-3 rounded-[var(--radius-lg)] border p-3 transition-all',
        'hover:border-border focus-within:border-border',
        inPlan && 'border-primary/30 bg-primary/[0.03]',
        highlighted && 'ring-primary/60 border-primary/50 ring-2',
      )}
    >
      <PlacePhoto photoName={detail?.photoName} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <PlaceAddressLink
            place={{
              label: entry.name,
              address: entry.address,
              lat: entry.lat,
              lng: entry.lng,
              placeId: entry.placeId,
            }}
            className="min-w-0"
          >
            <span className="block truncate text-sm font-semibold">
              {entry.name}
            </span>
          </PlaceAddressLink>

          {inPlan && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  tabIndex={0}
                  aria-label="Already in your itinerary"
                  className="text-primary mt-0.5 flex shrink-0 items-center"
                >
                  <CalendarCheck className="size-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Already in your itinerary</TooltipContent>
            </Tooltip>
          )}
        </div>

        {entry.address && (
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {entry.address}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {categoryLabel && (
            <span className="text-muted-foreground/70 text-[10px] tracking-[0.1em] uppercase">
              {categoryLabel}
            </span>
          )}

          <RatingBadge
            rating={rating}
            userRatingCount={detail?.userRatingCount}
          />

          <PriceLevel level={detail?.priceLevel} />

          <OpenStatePill
            openState={openState}
            weekdayDescriptions={detail?.openingHours?.weekdayDescriptions}
          />

          <WantLevel
            mode="indicator"
            variant={entry.kind === 'food' ? 'chili' : 'star'}
            value={entry.wantLevel}
          />
        </div>

        <div className="mt-2 flex items-center gap-1">
          <div className="ml-auto flex items-center gap-1 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-primary size-7"
              onClick={() => onAddToTimeline(entry)}
              aria-label={`Add ${entry.name} to a day`}
            >
              <CalendarPlus className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground size-7"
              onClick={() => onEdit(entry)}
              aria-label={`Edit ${entry.name}`}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive size-7"
              onClick={() => onDelete(entry)}
              aria-label={`Remove ${entry.name}`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
