'use client';

import { motion } from 'motion/react';
import { ArrowRight, MapPin } from 'lucide-react';
import type { TripItem } from '@/lib/trips/types';
import { Badge } from '@/components/ui/badge';
import { formatTime } from '@/lib/time/formatDate';
import { formatMoney } from '@/lib/trips/grouping';
import { kindMeta, transportIcons } from '@/lib/trips/kindMeta';
import { fadeUp, spring } from '@/lib/motion/presets';
import { cn } from '@/lib/utils';

interface TimelineItemProps {
  item: TripItem;
  isLast?: boolean;
  isCurrent?: boolean;
  onSelect?: () => void;
}

export function TimelineItem({
  item,
  isLast,
  isCurrent,
  onSelect,
}: TimelineItemProps) {
  const meta = kindMeta[item.kind];
  const Icon =
    item.kind === 'transport' && item.transportMode
      ? transportIcons[item.transportMode]
      : meta.icon;

  return (
    <motion.li
      variants={fadeUp}
      transition={spring.soft}
      className="group relative grid grid-cols-[3.75rem_1fr] gap-3 sm:grid-cols-[4.5rem_1fr] sm:gap-4"
    >
      <div className="flex flex-col items-end pt-1">
        <span className="text-sm leading-tight tabular-nums">
          {formatTime(item.startsAt)}
        </span>
        {item.endsAt && (
          <span className="text-muted-foreground text-[11px] leading-tight tabular-nums">
            {formatTime(item.endsAt)}
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
            'border-border/60 bg-card hover:border-foreground/15 focus-visible:ring-ring/60 relative flex w-full items-start gap-3 rounded-[var(--radius)] border p-3 text-left transition-[transform,box-shadow,border-color] hover:-translate-y-[1px] hover:shadow-[0_12px_28px_-16px_oklch(20%_0.02_250_/_0.2)] focus-visible:ring-2 focus-visible:outline-none',
            isCurrent &&
              'ring-primary/40 border-primary/30 bg-primary/[0.04] ring-2',
          )}
        >
          <span
            className="text-background grid size-8 shrink-0 place-items-center rounded-full"
            style={{ background: meta.accent }}
          >
            <Icon className="size-4" strokeWidth={2} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="leading-tight font-medium">{item.title}</div>
                {(item.from || item.to) && (
                  <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                    {item.from && (
                      <span className="truncate">{item.from.label}</span>
                    )}
                    {item.from && item.to && (
                      <ArrowRight className="size-3 shrink-0 opacity-50" />
                    )}
                    {item.to && !item.from && (
                      <MapPin className="size-3 shrink-0 opacity-60" />
                    )}
                    {item.to && (
                      <span className="truncate">{item.to.label}</span>
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
                {item.expense && (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {formatMoney(item.expense.amount, item.expense.currency)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
      </div>
    </motion.li>
  );
}
