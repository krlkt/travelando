'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export type ExpenseViewMode = 'mine' | 'trip';

interface ShareToggleProps {
  value: ExpenseViewMode;
  onChange: (mode: ExpenseViewMode) => void;
  className?: string;
}

const OPTIONS: ReadonlyArray<{ value: ExpenseViewMode; label: string }> = [
  { value: 'mine', label: 'My share' },
  { value: 'trip', label: 'Trip total' },
];

/**
 * Segmented control switching the expenses view between the current member's
 * share and the trip-wide total. A single `layoutId` thumb slides between the
 * two options. Exposed as a radiogroup for assistive tech.
 */
export function ShareToggle({ value, onChange, className }: ShareToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Expense view mode"
      className={cn(
        'border-border/50 bg-secondary/60 inline-flex items-center gap-1 rounded-full border p-1',
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'focus-visible:ring-ring/60 relative inline-flex h-8 items-center justify-center rounded-full px-3.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none',
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {isActive && (
              <motion.span
                layoutId="share-toggle-thumb"
                aria-hidden
                className="bg-background absolute inset-0 -z-0 rounded-full shadow-sm"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
