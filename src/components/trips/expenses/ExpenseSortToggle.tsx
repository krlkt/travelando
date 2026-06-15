'use client';

import { motion } from 'motion/react';
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ExpenseSortMode = 'spent' | 'added' | 'amount';
export type AmountSortDir = 'desc' | 'asc';

interface ExpenseSortToggleProps {
  value: ExpenseSortMode;
  amountDir: AmountSortDir;
  onChange: (mode: ExpenseSortMode) => void;
  onAmountDirChange: (dir: AmountSortDir) => void;
  className?: string;
}

/**
 * Segmented control choosing how the expenses list is ordered: by the day each
 * expense was spent (grouped), by when it was added (newest first), or by
 * amount. Clicking the active "Amount" option flips between biggest-first and
 * lowest-first. Mirrors {@link ShareToggle} with a sliding `layoutId` thumb.
 */
export function ExpenseSortToggle({
  value,
  amountDir,
  onChange,
  onAmountDirChange,
  className,
}: ExpenseSortToggleProps) {
  const amountActive = value === 'amount';
  const handleAmountClick = () => {
    if (amountActive) {
      onAmountDirChange(amountDir === 'desc' ? 'asc' : 'desc');
    } else {
      onChange('amount');
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Sort expenses"
      className={cn(
        'border-border/50 bg-secondary/60 inline-flex items-center gap-1 rounded-full border p-1',
        className,
      )}
    >
      <SortOption
        label="Spent date"
        isActive={value === 'spent'}
        onClick={() => onChange('spent')}
      />
      <SortOption
        label="Date added"
        isActive={value === 'added'}
        onClick={() => onChange('added')}
      />
      <SortOption
        label="Amount"
        isActive={amountActive}
        onClick={handleAmountClick}
        ariaLabel={
          amountActive
            ? `Amount, ${amountDir === 'desc' ? 'biggest first' : 'lowest first'} — tap to reverse`
            : 'Amount'
        }
        icon={
          amountActive ? (
            amountDir === 'desc' ? (
              <ArrowDownWideNarrow className="size-3.5" />
            ) : (
              <ArrowUpNarrowWide className="size-3.5" />
            )
          ) : null
        }
      />
    </div>
  );
}

interface SortOptionProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  ariaLabel?: string;
  icon?: React.ReactNode;
}

function SortOption({
  label,
  isActive,
  onClick,
  ariaLabel,
  icon,
}: SortOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isActive}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'focus-visible:ring-ring/60 relative inline-flex h-8 items-center justify-center gap-1 rounded-full px-3.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none',
        isActive
          ? 'text-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {isActive && (
        <motion.span
          layoutId="expense-sort-toggle-thumb"
          aria-hidden
          className="bg-background absolute inset-0 -z-0 rounded-full shadow-sm"
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-1">
        {label}
        {icon}
      </span>
    </button>
  );
}
