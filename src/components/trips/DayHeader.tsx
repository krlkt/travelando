'use client';

import {
  Bed,
  CalendarDays,
  Check,
  CircleCheck,
  Map as MapIcon,
  MapPin,
} from 'lucide-react';
import { formatDate } from '@/lib/time/formatDate';
import type { TripItem } from '@/lib/trips/types';
import { cn } from '@/lib/utils';

type TripView = 'timeline' | 'map';

interface DayHeaderProps {
  dayNumber: number;
  date: Date;
  isToday: boolean;
  itemCount: number;
  cityLabel: string;
  onChangeCity: () => void;
  lodging: TripItem | null;
  onSelectLodging: (item: TripItem) => void;
  isDone: boolean;
  onToggleDone: () => void;
  view: TripView;
  onViewChange: (view: TripView) => void;
}

/**
 * The single header block for the active day: "Day N" anchor + date on the
 * first line, a quiet city · lodging · count meta line beneath, and the
 * day-level controls (mark planned, timeline ⇄ map) clustered on the right.
 */
export function DayHeader({
  dayNumber,
  date,
  isToday,
  itemCount,
  cityLabel,
  onChangeCity,
  lodging,
  onSelectLodging,
  isDone,
  onToggleDone,
  view,
  onViewChange,
}: DayHeaderProps) {
  return (
    <div className="mt-4 mb-2 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h2 className="font-display text-2xl leading-none tracking-tight sm:text-3xl">
            Day {dayNumber}
          </h2>
          <span className="text-muted-foreground text-sm">
            {formatDate(date)}
          </span>
          {isToday && (
            <span className="bg-primary/12 text-primary inline-flex translate-y-[-1px] items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide">
              <span
                className="bg-primary size-1.5 animate-pulse rounded-full"
                aria-hidden
              />
              Today
            </span>
          )}
        </div>

        <div className="text-muted-foreground mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <button
            type="button"
            onClick={onChangeCity}
            title="Change city for this day"
            className="hover:text-foreground flex min-w-0 items-center gap-1.5 underline-offset-4 hover:underline"
          >
            <MapPin className="size-3 shrink-0 opacity-60" />
            <span className="truncate">{cityLabel}</span>
          </button>
          <span aria-hidden className="text-muted-foreground/40">
            ·
          </span>
          {lodging ? (
            <button
              type="button"
              onClick={() => onSelectLodging(lodging)}
              title="Where you're staying tonight"
              className="hover:text-foreground flex min-w-0 items-center gap-1.5 underline-offset-4 hover:underline"
            >
              <Bed className="size-3 shrink-0 opacity-60" />
              <span className="truncate">
                {lodging.to?.label ?? lodging.title}
              </span>
            </button>
          ) : (
            <span className="text-muted-foreground/60 flex items-center gap-1.5">
              <Bed className="size-3 opacity-60" />
              No lodging
            </span>
          )}
          {itemCount > 0 && (
            <>
              <span aria-hidden className="text-muted-foreground/40">
                ·
              </span>
              <span className="tabular-nums">
                {itemCount} {itemCount === 1 ? 'stop' : 'stops'}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleDone}
          aria-pressed={isDone}
          title={
            isDone
              ? 'Marked as planned — click to undo'
              : 'Mark this day as planned enough'
          }
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition',
            isDone
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400'
              : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-border',
          )}
        >
          {isDone ? (
            <CircleCheck className="size-3.5" />
          ) : (
            <Check className="size-3.5" />
          )}
          {isDone ? 'Planned' : 'Mark planned'}
        </button>

        <div className="border-border/60 bg-secondary/40 inline-flex rounded-full border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => onViewChange('timeline')}
            aria-pressed={view === 'timeline'}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition',
              view === 'timeline'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <CalendarDays className="size-3.5" />
            Timeline
          </button>
          <button
            type="button"
            onClick={() => onViewChange('map')}
            aria-pressed={view === 'map'}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition',
              view === 'map'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <MapIcon className="size-3.5" />
            Map
          </button>
        </div>
      </div>
    </div>
  );
}
