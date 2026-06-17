import type { ItemKind, TripItem } from '@/lib/trips/types';
import { kindMeta, transportIcons } from '@/lib/trips/kindMeta';
import { formatTime } from '@/lib/time/formatDate';
import { parseNaive } from '@/lib/time/naive';
import { cn } from '@/lib/utils';

interface ProposedSlot {
  label: string;
  kind: ItemKind;
  /** Naive wall-time start; the row is hidden until a start time is chosen. */
  startsAt?: string;
  endsAt?: string;
}

interface AddToDayTimelineProps {
  /** The day's scheduled items, already in start-time order. */
  items: TripItem[];
  /** The activity/meal about to be added, highlighted in place. */
  proposed: ProposedSlot;
}

type Row =
  | { proposed: false; item: TripItem }
  | { proposed: true; slot: ProposedSlot & { startsAt: string } };

function rowStart(row: Row): number {
  const startsAt = row.proposed ? row.slot.startsAt : row.item.startsAt;
  return parseNaive(startsAt).getTime();
}

function iconFor(kind: ItemKind, transportMode?: TripItem['transportMode']) {
  if (kind === 'transport' && transportMode)
    return transportIcons[transportMode];
  return kindMeta[kind].icon;
}

/**
 * A read-only, compact view of the day's timeline shown inside the
 * "add to this day" sheet. It merges the place being added (`proposed`) into
 * the day's existing stops at its chosen time so the user can see occupied
 * windows and gaps before committing to a slot.
 */
export function AddToDayTimeline({ items, proposed }: AddToDayTimelineProps) {
  const rows: Row[] = items.map((item) => ({ proposed: false, item }));
  if (proposed.startsAt) {
    rows.push({
      proposed: true,
      slot: { ...proposed, startsAt: proposed.startsAt },
    });
  }
  rows.sort((a, b) => rowStart(a) - rowStart(b));

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground/80 text-xs">
        Nothing planned yet — this would be your first stop of the day.
      </p>
    );
  }

  return (
    <div className="grid gap-1.5">
      <span className="text-muted-foreground/70 text-[11px] font-medium tracking-wide uppercase">
        This day
      </span>
      <ul className="max-h-44 overflow-y-auto pr-1">
        {rows.map((row) => {
          const kind = row.proposed ? row.slot.kind : row.item.kind;
          const meta = kindMeta[kind];
          const Icon = iconFor(
            kind,
            row.proposed ? undefined : (row.item.transportMode ?? undefined),
          );
          const start = row.proposed ? row.slot.startsAt : row.item.startsAt;
          const end = row.proposed ? row.slot.endsAt : row.item.endsAt;
          const title = row.proposed ? row.slot.label : row.item.title;

          return (
            <li
              key={row.proposed ? 'proposed' : row.item.id}
              className={cn(
                'flex items-center gap-2.5 rounded-[var(--radius-md)] px-1.5 py-1',
                row.proposed && 'bg-primary/[0.06] ring-primary/30 ring-1',
              )}
            >
              <span className="text-muted-foreground w-[5.5rem] shrink-0 text-right text-xs tabular-nums">
                {formatTime(start)}
                {end ? `–${formatTime(end)}` : ''}
              </span>
              <span
                aria-hidden
                className="text-background grid size-5 shrink-0 place-items-center rounded-full"
                style={{ background: meta.accent }}
              >
                <Icon className="size-3" strokeWidth={2} />
              </span>
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-sm',
                  row.proposed && 'font-medium',
                )}
              >
                {title}
                {row.proposed && (
                  <span className="text-primary ml-1.5 text-[10px] font-semibold tracking-wide uppercase">
                    New
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
