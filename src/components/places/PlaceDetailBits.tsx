'use client';

import { Star } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  /** Tailwind size class for the box (e.g. `size-16`). */
  sizeClass?: string;
  /** Intrinsic px for the `<img>` width/height attributes (avoids CLS). */
  dimPx?: number;
  /** Requested photo width from the proxy. */
  fetchW?: number;
}

/** Square place thumbnail, falling back to a star placeholder when no photo. */
export function PlacePhoto({
  photoName,
  sizeClass = 'size-16',
  dimPx = 64,
  fetchW = 160,
}: PlacePhotoProps) {
  if (photoName) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/places/photo?name=${encodeURIComponent(photoName)}&w=${fetchW}`}
        alt=""
        width={dimPx}
        height={dimPx}
        loading="lazy"
        className={cn(
          'border-border/40 shrink-0 rounded-[var(--radius-md)] border object-cover',
          sizeClass,
        )}
      />
    );
  }
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

/** Open/Closed pill with an optional weekday-hours tooltip. Null when unknown. */
export function OpenStatePill({
  openState,
  weekdayDescriptions,
}: OpenStatePillProps) {
  if (openState === 'unknown') return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
            OPEN_PILL[openState],
          )}
        >
          {openState === 'open' ? 'Open now' : 'Closed'}
        </span>
      </TooltipTrigger>
      {weekdayDescriptions && weekdayDescriptions.length > 0 && (
        <TooltipContent className="max-w-56">
          <ul className="space-y-0.5 text-xs">
            {weekdayDescriptions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
