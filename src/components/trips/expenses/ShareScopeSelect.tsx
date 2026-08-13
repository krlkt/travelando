'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Users } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { TripMember } from '@/lib/trips/types';

/**
 * The expenses view scope: `null` means the trip-wide total, otherwise the
 * member id whose share is being shown. Kept as a plain nullable string so it
 * threads straight into `shareForMember` / `aggregateByCurrency`.
 */
export type ShareScope = string | null;

interface ShareScopeSelectProps {
  members: TripMember[];
  value: ShareScope;
  currentMemberId: string | null;
  onChange: (value: ShareScope) => void;
  className?: string;
}

function firstName(name: string): string {
  return name.split(/\s+/)[0] || name;
}

function initialsFor(member: TripMember): string {
  const source = member.displayName || member.email || '?';
  return source
    .split(/\s+/)
    .map((s) => s.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/** Members ordered with the current user pinned first, then alphabetical. */
function orderMembers(
  members: TripMember[],
  currentMemberId: string | null,
): TripMember[] {
  return [...members].sort((a, b) => {
    if (a.id === currentMemberId) return -1;
    if (b.id === currentMemberId) return 1;
    return a.displayName.localeCompare(b.displayName);
  });
}

/** Small round avatar with image or initials fallback. */
function MemberDot({
  member,
  className,
}: {
  member: TripMember;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'bg-muted text-foreground grid size-5 shrink-0 place-items-center overflow-hidden rounded-full text-[9px] font-semibold',
        className,
      )}
    >
      {member.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        initialsFor(member)
      )}
    </span>
  );
}

/** The all-members glyph used for the trip-total scope. */
function TripDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'bg-primary/15 text-primary grid size-5 shrink-0 place-items-center rounded-full',
        className,
      )}
    >
      <Users className="size-3" />
    </span>
  );
}

/**
 * Scope picker for the expenses view. Replaces the old two-way segmented
 * toggle: the user can focus the totals and list on the trip as a whole or on
 * any single member's share. A single compact pill opens a popover listing
 * "Trip total" plus every member, so it scales to any group size and reads the
 * same on mobile and desktop.
 */
export function ShareScopeSelect({
  members,
  value,
  currentMemberId,
  onChange,
  className,
}: ShareScopeSelectProps) {
  const [open, setOpen] = useState(false);
  const ordered = useMemo(
    () => orderMembers(members, currentMemberId),
    [members, currentMemberId],
  );
  const selected = value ? members.find((m) => m.id === value) : undefined;

  const triggerLabel = !value
    ? 'Trip'
    : value === currentMemberId
      ? 'You'
      : firstName(selected?.displayName ?? 'Member');

  const select = (next: ShareScope) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Change whose spending is shown"
          className={cn(
            'border-border/50 bg-secondary/60 hover:bg-secondary focus-visible:ring-ring/60 inline-flex h-8 items-center gap-1.5 rounded-full border pr-2 pl-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
            className,
          )}
        >
          {selected ? <MemberDot member={selected} /> : <TripDot />}
          <span className="max-w-[7rem] truncate">{triggerLabel}</span>
          <ChevronDown className="text-muted-foreground size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-60 p-1"
        role="listbox"
        aria-label="Expense view scope"
      >
        <ScopeRow
          selected={value === null}
          onSelect={() => select(null)}
          leading={<TripDot className="size-7 [&_svg]:size-3.5" />}
          title="Trip total"
          subtitle="Everyone's spending"
        />
        <div className="bg-border/60 my-1 h-px" role="none" />
        <div className="max-h-64 overflow-y-auto">
          {ordered.map((member) => {
            const isMe = member.id === currentMemberId;
            return (
              <ScopeRow
                key={member.id}
                selected={value === member.id}
                onSelect={() => select(member.id)}
                leading={
                  <MemberDot member={member} className="size-7 text-xs" />
                }
                title={member.displayName}
                subtitle={
                  isMe
                    ? 'Your share'
                    : `${firstName(member.displayName)}'s share`
                }
              />
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ScopeRowProps {
  selected: boolean;
  onSelect: () => void;
  leading: React.ReactNode;
  title: string;
  subtitle: string;
}

function ScopeRow({
  selected,
  onSelect,
  leading,
  title,
  subtitle,
}: ScopeRowProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        'hover:bg-secondary/70 flex w-full items-center gap-2.5 rounded-[var(--radius)] px-2 py-1.5 text-left transition-colors',
        selected && 'bg-secondary/50',
      )}
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="text-muted-foreground block truncate text-[11px]">
          {subtitle}
        </span>
      </span>
      <Check
        className={cn(
          'text-primary size-4 shrink-0 transition-opacity',
          selected ? 'opacity-100' : 'opacity-0',
        )}
      />
    </button>
  );
}
