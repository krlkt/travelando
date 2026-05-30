'use client';

import { motion } from 'motion/react';
import { ArrowRight, MapPin } from 'lucide-react';
import type { TripItem } from '@/lib/trips/types';
import type { ItemExpenseTotal } from '@/lib/trips/itemExpenseTotals';
import { Badge } from '@/components/ui/badge';
import { dayOffsetFrom, formatTime } from '@/lib/time/formatDate';
import { kindMeta, transportIcons } from '@/lib/trips/kindMeta';
import { routeHeadline, routeStations } from '@/lib/trips/transportRoute';
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
}: TimelineItemProps) {
  const meta = kindMeta[item.kind];
  const Icon =
    item.kind === 'transport' && item.transportMode
      ? transportIcons[item.transportMode]
      : meta.icon;

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

      <div className="relative pb-6">
        {!isLast && (
          <span
            aria-hidden
            className="bg-border absolute top-9 bottom-0 left-[15px] w-px"
          />
        )}
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            'border-border/60 bg-card hover:border-foreground/15 focus-visible:ring-ring/60 relative block w-full rounded-[var(--radius)] border p-3 text-left transition-[transform,box-shadow,border-color] hover:-translate-y-[1px] hover:shadow-[0_12px_28px_-16px_oklch(20%_0.02_250_/_0.2)] focus-visible:ring-2 focus-visible:outline-none',
            isCurrent &&
              'ring-primary/40 border-primary/30 bg-primary/[0.04] ring-2',
          )}
        >
          <div className="flex w-full min-w-0 items-start gap-3">
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
                  {(route.from || route.to) && (
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
                  )}
                  {stations && (
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
        </button>
      </div>
    </motion.li>
  );
}
