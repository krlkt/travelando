'use client';

import type { MouseEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Layers, Lock, MapPin, Navigation } from 'lucide-react';
import type { TripItem } from '@/lib/trips/types';
import type { ItemExpenseTotal } from '@/lib/trips/itemExpenseTotals';
import type { TransportPrefill } from '@/lib/trips/legGap';
import { Badge } from '@/components/ui/badge';
import { dayOffsetFrom, formatTime } from '@/lib/time/formatDate';
import { kindMeta, transportIcons } from '@/lib/trips/kindMeta';
import { routeHeadline, routeStations } from '@/lib/trips/transportRoute';
import { timelineLegGap } from '@/lib/trips/legGap';
import { openMapsLink } from '@/lib/places/maps-link';
import { directionsForItem } from '@/lib/trips/itemDirections';
import { LegActions } from './LegActions';
import { formatMoney } from '@/lib/trips/grouping';
import { fadeUp, spring } from '@/lib/motion/presets';
import { timelineGridClass } from './timelineGrid';
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
  /** Opens the editor pre-filled with a transport item for the leg to nextItem. */
  onAddTransport?: (prefill: TransportPrefill) => void;
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
  onAddTransport,
}: TimelineItemProps) {
  const meta = kindMeta[item.kind];
  const Icon =
    item.kind === 'transport' && item.transportMode
      ? transportIcons[item.transportMode]
      : meta.icon;

  // The connector leg to the next stop: a directions link and/or a quick-add
  // transport prefill when nothing already bridges the two places.
  const leg = nextItem ? timelineLegGap(item, nextItem) : null;

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
  const hasMetaLine =
    !!routeDirections || !!route.from || !!route.to || !!stations;
  const privateCount = item.privateToUserIds?.length ?? 0;

  return (
    <motion.li
      variants={fadeUp}
      transition={spring.soft}
      className={cn(
        'group relative z-0 focus-within:z-30 hover:z-30',
        timelineGridClass,
      )}
    >
      {/* Time column */}
      <div className="flex flex-col items-end pt-3">
        <span className="text-sm leading-tight font-medium tabular-nums">
          {formatTime(item.startsAt)}
          {startSuffix && (
            <span className="text-muted-foreground/80 ml-0.5 text-[10px] font-normal">
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

      {/* Rail: kind-colored node + connector to the next stop */}
      <div className="relative flex justify-center">
        {!isLast && (
          <span
            aria-hidden
            className="bg-border absolute top-9 -bottom-2 left-1/2 w-px -translate-x-1/2"
          />
        )}
        <span
          className={cn(
            'text-background relative z-[1] mt-2 grid size-7 shrink-0 place-items-center rounded-full',
            isCurrent && 'ring-primary/25 animate-pulse ring-4',
          )}
          style={{ background: meta.accent }}
        >
          <Icon className="size-3.5" strokeWidth={2} />
        </span>
        {!isLast && leg && (
          <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 transition-opacity duration-200 pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100">
            <LegActions
              originLabel={leg.origin.label}
              destinationLabel={leg.destination.label}
              directionsUrl={leg.directionsUrl}
              onAddTransport={
                leg.prefill && onAddTransport
                  ? () => onAddTransport(leg.prefill!)
                  : undefined
              }
            />
          </div>
        )}
      </div>

      {/* Card */}
      <div className={cn('relative pb-6', !isLast && leg && 'pb-10')}>
        <div
          className={cn(
            'border-border/60 bg-card hover:border-foreground/15 relative block w-full rounded-[var(--radius)] border p-3 text-left transition-[transform,box-shadow,border-color] hover:-translate-y-[1px] hover:shadow-[0_12px_28px_-16px_oklch(20%_0.02_250_/_0.2)]',
            isCurrent && 'border-primary/30 bg-primary/[0.04]',
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
          <div className="pointer-events-none relative z-[1] flex w-full min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="leading-snug font-medium">{item.title}</div>
              {hasMetaLine && (
                <div className="text-muted-foreground mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                  {routeDirections ? (
                    <a
                      href={routeDirections.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={openDirections}
                      aria-label={`Directions from ${routeDirections.fromLabel} to ${routeDirections.toLabel} in Google Maps`}
                      className="hover:text-foreground focus-visible:text-foreground pointer-events-auto flex w-fit min-w-0 items-center gap-1.5 rounded-sm underline-offset-2 transition-colors hover:underline focus-visible:underline focus-visible:outline-none"
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
                    <span className="flex min-w-0 items-center gap-1.5">
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
                    </span>
                  ) : null}
                  {stations && !routeDirections && (
                    <span className="text-muted-foreground/70 flex min-w-0 items-center gap-1 text-[11px]">
                      {stations.from && (
                        <span className="truncate">{stations.from.label}</span>
                      )}
                      {stations.from && stations.to && (
                        <ArrowRight className="size-2.5 shrink-0 opacity-50" />
                      )}
                      {stations.to && (
                        <span className="truncate">{stations.to.label}</span>
                      )}
                    </span>
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
              {(isOverlapping && !isCurrent) || privateCount > 0 ? (
                <div className="flex items-center gap-1">
                  {isOverlapping && !isCurrent && (
                    <span
                      title="Overlaps another item"
                      aria-label="Overlaps another item"
                      className="border-border/60 text-muted-foreground/80 pointer-events-auto grid size-5 place-items-center rounded-full border"
                    >
                      <Layers className="size-3" />
                    </span>
                  )}
                  {privateCount > 0 && (
                    <span
                      title={
                        privateCount === 1
                          ? 'Private'
                          : `Private · visible to ${privateCount} people`
                      }
                      aria-label={
                        privateCount === 1
                          ? 'Private'
                          : `Private, visible to ${privateCount} people`
                      }
                      className="border-border/60 text-muted-foreground/80 pointer-events-auto grid size-5 place-items-center rounded-full border"
                    >
                      <Lock className="size-2.5" />
                    </span>
                  )}
                </div>
              ) : null}
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
    </motion.li>
  );
}
