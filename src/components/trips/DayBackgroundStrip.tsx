'use client';

import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import type { TripItem } from '@/lib/trips/types';
import { dayOffsetFrom, formatTime } from '@/lib/time/formatDate';
import { kindMeta, transportIcons } from '@/lib/trips/kindMeta';
import { routeHeadline } from '@/lib/trips/transportRoute';
import { fadeUp, spring } from '@/lib/motion/presets';
import { cn } from '@/lib/utils';

interface DayBackgroundStripProps {
  items: TripItem[];
  bucketDate?: Date;
  onSelect: (item: TripItem) => void;
}

function dayOffsetSuffix(offset: number): string {
  if (offset === 0) return '';
  const sign = offset > 0 ? '+' : '−';
  return ` ${sign}${Math.abs(offset)}d`;
}

export function DayBackgroundStrip({
  items,
  bucketDate,
  onSelect,
}: DayBackgroundStripProps) {
  if (items.length === 0) return null;

  const multi = items.length > 1;

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      transition={spring.soft}
      className={cn(
        'mb-3 flex gap-2',
        multi ? 'snap-x snap-mandatory overflow-x-auto pb-1' : 'flex-col',
      )}
      aria-label="All-day context"
    >
      {items.map((item) => {
        const meta = kindMeta[item.kind];
        const Icon =
          item.kind === 'transport' && item.transportMode
            ? transportIcons[item.transportMode]
            : meta.icon;

        const endOffset =
          bucketDate && item.endsAt
            ? dayOffsetFrom(bucketDate, item.endsAt)
            : 0;
        const startOffset = bucketDate
          ? dayOffsetFrom(bucketDate, item.startsAt)
          : 0;

        const route = routeHeadline(item);
        const routeLabel =
          route.from?.label && route.to?.label
            ? null
            : (route.to?.label ?? route.from?.label ?? null);

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={cn(
              'border-border/50 bg-secondary/30 hover:border-foreground/15 focus-visible:ring-ring/60 group relative block rounded-[var(--radius)] border px-2.5 py-1.5 text-left transition-[transform,box-shadow,border-color] hover:-translate-y-[1px] hover:shadow-[0_10px_24px_-18px_oklch(20%_0.02_250_/_0.25)] focus-visible:ring-2 focus-visible:outline-none',
              multi ? 'shrink-0 snap-start' : 'w-full',
            )}
          >
            <div className="flex w-full min-w-0 items-center gap-2.5">
              <span
                className="text-background grid size-6 shrink-0 place-items-center rounded-full"
                style={{ background: meta.accent }}
              >
                <Icon className="size-3" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium">
                  {route.from?.label && route.to?.label ? (
                    <>
                      <span className="truncate">{route.from.label}</span>
                      <ArrowRight className="size-3 shrink-0 opacity-50" />
                      <span className="truncate">{route.to.label}</span>
                    </>
                  ) : (
                    <span className="truncate">{routeLabel ?? item.title}</span>
                  )}
                </div>
                <div className="text-muted-foreground mt-0.5 text-[11px] tabular-nums">
                  {formatTime(item.startsAt)}
                  {startOffset !== 0 && (
                    <span className="ml-0.5 text-[10px] opacity-80">
                      {dayOffsetSuffix(startOffset)}
                    </span>
                  )}
                  {item.endsAt && (
                    <>
                      <span className="mx-1 opacity-60">–</span>
                      {formatTime(item.endsAt)}
                      {endOffset !== 0 && (
                        <span className="ml-0.5 text-[10px] opacity-80">
                          {dayOffsetSuffix(endOffset)}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </motion.div>
  );
}
