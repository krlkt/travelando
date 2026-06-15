'use client';

import { MapPin } from 'lucide-react';
import type { ExpenseCityGroup } from '@/lib/trips/expenseCities';

interface CityFilterProps {
  groups: ExpenseCityGroup[];
  /** `null` means every city (the default). */
  selected: string | null;
  onSelect: (key: string | null) => void;
}

/**
 * Chip row narrowing the expenses list to a single city. Cities are derived
 * from each expense's spent day. Renders nothing when one city or fewer is
 * present, since there is nothing to filter.
 */
export function CityFilter({ groups, selected, onSelect }: CityFilterProps) {
  if (groups.length <= 1) return null;

  return (
    <div
      role="group"
      aria-label="Filter expenses by city"
      className="mt-4 flex flex-wrap items-center gap-1.5"
    >
      <Chip active={selected === null} onClick={() => onSelect(null)}>
        <MapPin className="size-3 shrink-0 opacity-60" />
        All cities
      </Chip>
      {groups.map((group) => (
        <Chip
          key={group.key}
          active={selected === group.key}
          onClick={() => onSelect(selected === group.key ? null : group.key)}
        >
          {group.label}
          <span className="text-muted-foreground/60 tabular-nums">
            {group.count}
          </span>
        </Chip>
      ))}
    </div>
  );
}

interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function Chip({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`focus-visible:ring-ring/60 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition focus-visible:ring-2 focus-visible:outline-none ${
        active
          ? 'border-foreground bg-foreground text-background'
          : 'text-muted-foreground/80 border-border/50 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}
