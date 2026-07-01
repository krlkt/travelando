'use client';

import { useState } from 'react';
import { ChevronDown, Images, Star } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PlacePhotoGallery } from '@/components/places/PlacePhotoGallery';
import type { OpenState } from '@/lib/places/openingHours';
import { cn } from '@/lib/utils';

/**
 * Shared visual atoms for an enriched Google place: photo thumbnail, rating,
 * price level, and an open-now pill. Used by both the wishlist card and the
 * day-map "add to day" sheet so the two surfaces stay visually identical.
 */

const PRICE_MAX = 4;

const OPEN_PILL: Record<Exclude<OpenState, 'unknown'>, string> = {
  open: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  closed: 'bg-rose-500/12 text-rose-600 dark:text-rose-400',
};

interface PlacePhotoProps {
  photoName?: string;
  /**
   * All photo refs for the place. When more than one is present the thumbnail
   * becomes a button that opens an on-demand gallery; the extra images are only
   * fetched once it's opened.
   */
  photoNames?: string[];
  /** Place name, used for the gallery title and image alt text. */
  placeName?: string;
  /** Tailwind size class for the box (e.g. `size-16`). */
  sizeClass?: string;
  /** Intrinsic px for the `<img>` width/height attributes (avoids CLS). */
  dimPx?: number;
  /** Requested photo width from the proxy. */
  fetchW?: number;
}

/**
 * Square place thumbnail, falling back to a star placeholder when no photo.
 * When {@link PlacePhotoProps.photoNames} holds more than one photo the
 * thumbnail turns into a gallery trigger, marked by a hover/focus overlay and a
 * count chip; the additional images load only when the gallery is opened.
 */
export function PlacePhoto({
  photoName,
  photoNames,
  placeName = '',
  sizeClass = 'size-16',
  dimPx = 64,
  fetchW = 160,
}: PlacePhotoProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const extraCount = photoNames ? photoNames.length : 0;
  const hasGallery = extraCount > 1;

  if (!photoName) {
    return (
      <div
        aria-hidden
        className={cn(
          'bg-secondary/60 text-muted-foreground/40 grid shrink-0 place-items-center rounded-[var(--radius-md)]',
          sizeClass,
        )}
      >
        <Star className="size-5" />
      </div>
    );
  }

  const thumb = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/places/photo?name=${encodeURIComponent(photoName)}&w=${fetchW}`}
      alt=""
      width={dimPx}
      height={dimPx}
      loading="lazy"
      className={cn(
        'border-border/40 size-full rounded-[var(--radius-md)] border object-cover',
      )}
    />
  );

  if (!hasGallery) {
    return <div className={cn('shrink-0', sizeClass)}>{thumb}</div>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setGalleryOpen(true)}
        aria-label={`View ${extraCount} photos of ${placeName || 'this place'}`}
        className={cn(
          'group/photo focus-visible:ring-ring relative shrink-0 overflow-hidden rounded-[var(--radius-md)] focus:outline-none focus-visible:ring-2',
          sizeClass,
        )}
      >
        {thumb}
        <span className="absolute inset-0 bg-black/0 transition-colors group-hover/photo:bg-black/25 group-focus-visible/photo:bg-black/25" />
        <span className="pointer-events-none absolute right-1 bottom-1 flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
          <Images className="size-2.5" aria-hidden />
          {extraCount}
        </span>
      </button>

      <PlacePhotoGallery
        photoNames={photoNames!}
        placeName={placeName}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
      />
    </>
  );
}

/** `$$` price affordance, `Free` at level 0. Renders nothing when unknown. */
export function PriceLevel({ level }: { level?: number }) {
  if (level == null) return null;
  if (level <= 0) {
    return <span className="text-muted-foreground text-xs">Free</span>;
  }
  return (
    <span
      className="text-xs tracking-tight"
      aria-label={`Price level ${level} of ${PRICE_MAX}`}
    >
      <span className="text-foreground/80">{'$'.repeat(level)}</span>
      <span className="text-muted-foreground/40">
        {'$'.repeat(PRICE_MAX - level)}
      </span>
    </span>
  );
}

interface RatingBadgeProps {
  rating?: number;
  userRatingCount?: number;
}

/** Star + average rating with optional review count. Null when no rating. */
export function RatingBadge({ rating, userRatingCount }: RatingBadgeProps) {
  if (rating == null) return null;
  return (
    <span className="flex items-center gap-1 text-xs font-medium">
      <Star className="size-3 fill-amber-400 text-amber-400" />
      {rating.toFixed(1)}
      {userRatingCount != null && (
        <span className="text-muted-foreground/60 font-normal">
          ({userRatingCount.toLocaleString()})
        </span>
      )}
    </span>
  );
}

interface OpenStatePillProps {
  openState: OpenState;
  /** Per-weekday hours, shown in a tooltip when present. */
  weekdayDescriptions?: string[];
}

/**
 * Open/Closed pill. When weekday hours are known it becomes a tappable
 * disclosure (popover) so the full schedule is reachable on touch devices,
 * not just on hover. Null when the open state is unknown.
 */
export function OpenStatePill({
  openState,
  weekdayDescriptions,
}: OpenStatePillProps) {
  if (openState === 'unknown') return null;

  const label = openState === 'open' ? 'Open now' : 'Closed';
  const pillClass = cn(
    'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
    OPEN_PILL[openState],
  );
  const hasHours = Boolean(weekdayDescriptions && weekdayDescriptions.length);

  if (!hasHours) {
    return <span className={pillClass}>{label}</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label} — show opening hours`}
          className={cn(
            pillClass,
            'focus-visible:ring-ring inline-flex items-center gap-0.5 focus:outline-none focus-visible:ring-2',
          )}
        >
          {label}
          <ChevronDown className="size-2.5 opacity-70" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-56">
        <ul className="space-y-0.5 text-xs">
          {weekdayDescriptions!.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
