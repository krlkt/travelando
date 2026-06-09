'use client';

import type { MouseEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Lock, MapPin, Navigation } from 'lucide-react';
import type { Place, TripItem } from '@/lib/trips/types';
import type { ItemExpenseTotal } from '@/lib/trips/itemExpenseTotals';
import { Badge } from '@/components/ui/badge';
import { dayOffsetFrom, formatTime } from '@/lib/time/formatDate';
import { kindMeta, transportIcons } from '@/lib/trips/kindMeta';
import { routeHeadline, routeStations } from '@/lib/trips/transportRoute';
import { itemEndPlace, itemStartPlace } from '@/lib/trips/itemLocation';
import {
  buildDirectionsUrl,
  canRouteBetween,
  openMapsLink,
} from '@/lib/places/maps-link';
import { directionsForItem } from '@/lib/trips/itemDirections';
import { isSamePlace } from '@/lib/places/samePlace';
import { formatMoney } from '@/lib/trips/grouping';
import { fadeUp, spring } from '@/lib/motion/presets';
import { cn } from '@/lib/utils';

interface TimelineItemProps {
  item: TripItem;
  isLast?: boolean;
  isCurrent?: boolean;
  isOverlapping?: boolean;
  bucketDate?: Date;
  onSelect?: () => void;
  expenseTotal?: ItemExpenseTotal;
  /** The next event in the timeline, used to offer A → B directions. */
  nextItem?: TripItem;
}

/**
 * Icon-only pill sitting on the connector rail between two items. Opens Google
 * Maps directions from the previous stop (A) to the next (B). The label is
 * hidden until hover/focus so dense days stay uncluttered.
 */
function DirectionsLeg({
  origin,
  destination,
  url,
}: {
  origin: Place;
  destination: Place;
  url: string;
}) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    e.stopPropagation();
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isMobile) {
      e.preventDefault();
      window.location.href = url;
    }
  }

  return (
    <div className="group/leg absolute bottom-[0.9rem] left-[15px] z-10 -translate-x-1/2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label={`Directions from ${origin.label} to ${destination.label} in Google Maps`}
        className="border-border bg-background text-muted-foreground/70 hover:border-foreground/25 hover:text-foreground focus-visible:ring-ring/60 relative grid size-5 place-items-center rounded-full border transition-[color,border-color,transform] hover:scale-110 focus-visible:ring-2 focus-visible:outline-none"
      >
        <Navigation className="size-2.5" strokeWidth={2.25} />
        <span className="bg-foreground text-background pointer-events-none absolute left-full ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap opacity-0 transition-opacity group-focus-within/leg:opacity-100 group-hover/leg:opacity-100">
          Directions
        </span>
      </a>
    </div>
  );
}

function dayOffsetSuffix(offset: number): string {
  if (offset === 0) return '';
  const sign = offset > 0 ? '+' : '−';
  return ` ${sign}${Math.abs(offset)}d`;
}

export function TimelineItem({
  item,
  isLast,
  isCurrent,
  isOverlapping,
  bucketDate,
  onSelect,
  expenseTotal,
  nextItem,
}: TimelineItemProps) {
  const meta = kindMeta[item.kind];
  const Icon =
    item.kind === 'transport' && item.transportMode
      ? transportIcons[item.transportMode]
      : meta.icon;

  const legOrigin = itemEndPlace(item);
  const legDestination = nextItem ? itemStartPlace(nextItem) : undefined;
  const directionsUrl =
    legOrigin &&
    legDestination &&
    !isSamePlace(legOrigin, legDestination) &&
    canRouteBetween(legOrigin, legDestination)
      ? buildDirectionsUrl(legOrigin, legDestination)
      : null;

  // A transport item is itself an A → B journey, so its route line doubles as a
  // directions link. It uses the "Depart from"/"Arrive at" waypoints (falling
  // back to the cities) — same endpoints the directions URL routes between.
  const ownDirections = directionsForItem(item);
  const routeDirections =
    ownDirections?.kind === 'route' ? ownDirections : null;

  function openDirections(e: MouseEvent<HTMLAnchorElement>): void {
    e.stopPropagation();
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isMobile && routeDirections) {
      e.preventDefault();
      openMapsLink(routeDirections.url);
    }
  }

  const startOffset = bucketDate ? dayOffsetFrom(bucketDate, item.startsAt) : 0;
  const endOffset =
    bucketDate && item.endsAt ? dayOffsetFrom(bucketDate, item.endsAt) : 0;
  const startSuffix = dayOffsetSuffix(startOffset);
  const endSuffix = dayOffsetSuffix(endOffset);

  const route = routeHeadline(item);
  const stations = routeStations(item);

  return (
    <motion.li
      variants={fadeUp}
      transition={spring.soft}
      className="group relative grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-4"
    >
      <div className="flex flex-col items-end pt-1">
        <span className="text-sm leading-tight tabular-nums">
          {formatTime(item.startsAt)}
          {startSuffix && (
            <span className="text-muted-foreground/80 ml-0.5 text-[10px]">
              {startSuffix}
            </span>
          )}
        </span>
        {item.endsAt && (
          <span className="text-muted-foreground text-[11px] leading-tight tabular-nums">
            {formatTime(item.endsAt)}
            {endSuffix && (
              <span className="text-muted-foreground/80 ml-0.5 text-[10px]">
                {endSuffix}
              </span>
            )}
          </span>
        )}
      </div>

      <div className={cn('relative pb-6', directionsUrl && 'pb-12')}>
        {!isLast && (
          <span
            aria-hidden
            className="bg-border absolute top-9 bottom-0 left-[15px] w-px"
          />
        )}
        <div
          className={cn(
            'border-border/60 bg-card hover:border-foreground/15 relative block w-full rounded-[var(--radius)] border p-3 text-left transition-[transform,box-shadow,border-color] hover:-translate-y-[1px] hover:shadow-[0_12px_28px_-16px_oklch(20%_0.02_250_/_0.2)]',
            isCurrent &&
              'ring-primary/40 border-primary/30 bg-primary/[0.04] ring-2',
          )}
        >
          {/* Full-card selection target, beneath the content so any non-link
              area opens the detail sheet. */}
          <button
            type="button"
            onClick={onSelect}
            aria-label={`Open ${item.title}`}
            className="focus-visible:ring-ring/60 absolute inset-0 z-0 rounded-[var(--radius)] focus-visible:ring-2 focus-visible:outline-none"
          />
          <div className="pointer-events-none relative z-[1] flex w-full min-w-0 items-start gap-3">
            <span
              className="text-background grid size-8 shrink-0 place-items-center rounded-full"
              style={{ background: meta.accent }}
            >
              <Icon className="size-4" strokeWidth={2} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex w-full min-w-0 items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="leading-tight font-medium">{item.title}</div>
                  {routeDirections ? (
                    <a
                      href={routeDirections.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={openDirections}
                      aria-label={`Directions from ${routeDirections.fromLabel} to ${routeDirections.toLabel} in Google Maps`}
                      className="text-muted-foreground hover:text-foreground focus-visible:text-foreground pointer-events-auto mt-1 flex w-fit min-w-0 items-center gap-1.5 rounded-sm text-xs underline-offset-2 transition-colors hover:underline focus-visible:underline focus-visible:outline-none"
                    >
                      <span className="truncate">
                        {routeDirections.fromLabel}
                      </span>
                      <ArrowRight className="size-3 shrink-0 opacity-50" />
                      <span className="truncate">
                        {routeDirections.toLabel}
                      </span>
                      <Navigation className="ml-0.5 size-3 shrink-0 opacity-60" />
                    </a>
                  ) : route.from || route.to ? (
                    <div className="text-muted-foreground mt-1 flex min-w-0 items-center gap-1.5 text-xs">
                      {route.from && (
                        <span className="truncate">{route.from.label}</span>
                      )}
                      {route.from && route.to && (
                        <ArrowRight className="size-3 shrink-0 opacity-50" />
                      )}
                      {route.to && !route.from && (
                        <MapPin className="size-3 shrink-0 opacity-60" />
                      )}
                      {route.to && (
                        <span className="truncate">{route.to.label}</span>
                      )}
                    </div>
                  ) : null}
                  {stations && !routeDirections && (
                    <div className="text-muted-foreground/70 mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px]">
                      {stations.from && (
                        <span className="truncate">{stations.from.label}</span>
                      )}
                      {stations.from && stations.to && (
                        <ArrowRight className="size-2.5 shrink-0 opacity-50" />
                      )}
                      {stations.to && (
                        <span className="truncate">{stations.to.label}</span>
                      )}
                    </div>
                  )}
                  {item.notes && (
                    <div className="text-muted-foreground/80 mt-1 line-clamp-1 text-xs">
                      {item.notes}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {isCurrent && (
                    <Badge variant="primary" className="gap-1">
                      <span className="bg-primary size-1.5 animate-pulse rounded-full" />
                      Now
                    </Badge>
                  )}
                  {isOverlapping && !isCurrent && (
                    <Badge variant="muted" className="text-[10px]">
                      overlaps
                    </Badge>
                  )}
                  {item.privateToUserIds &&
                    item.privateToUserIds.length > 0 && (
                      <Badge variant="muted" className="gap-1 text-[10px]">
                        <Lock className="size-2.5" />
                        {item.privateToUserIds.length === 1
                          ? 'Private'
                          : `Private · ${item.privateToUserIds.length}`}
                      </Badge>
                    )}
                  {expenseTotal && expenseTotal.byCurrency.length > 0 && (
                    <div className="flex flex-col items-end gap-0.5 leading-tight">
                      {expenseTotal.byCurrency.map((c) => (
                        <div
                          key={c.currency}
                          className="flex flex-col items-end gap-0.5"
                        >
                          <span className="text-sm tabular-nums">
                            {formatMoney(c.total, c.currency)}
                          </span>
                          {c.mine > 0 && (
                            <span className="text-muted-foreground text-[11px] tabular-nums">
                              you {formatMoney(c.mine, c.currency)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {!isLast && directionsUrl && legOrigin && legDestination && (
          <DirectionsLeg
            origin={legOrigin}
            destination={legDestination}
            url={directionsUrl}
          />
        )}
      </div>
    </motion.li>
  );
}
