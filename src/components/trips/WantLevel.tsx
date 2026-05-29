'use client';

import { cn } from '@/lib/utils';

const MAX_LEVEL = 5;
const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

const LEVEL_HINTS: Record<number, string> = {
  1: 'Mild curiosity',
  2: 'Would try',
  3: 'Keen',
  4: 'Really want',
  5: 'Must eat',
};

interface WantLevelSelectProps {
  mode?: 'select';
  value?: number;
  onChange: (value: number | undefined) => void;
}

interface WantLevelIndicatorProps {
  mode: 'indicator';
  value?: number;
}

type WantLevelProps = WantLevelSelectProps | WantLevelIndicatorProps;

/**
 * Chili "craving" meter for the food wishlist want level (1-5).
 * - `select`: tappable radiogroup with large hit areas for mobile.
 * - `indicator`: compact read-only meter for list rows.
 */
export function WantLevel(props: WantLevelProps) {
  if (props.mode === 'indicator') {
    if (!props.value) return null;
    return (
      <span
        className="flex shrink-0 items-center gap-px"
        aria-label={`Want level ${props.value} of ${MAX_LEVEL}`}
      >
        {LEVELS.map((level) => (
          <span
            key={level}
            aria-hidden
            className={cn(
              'text-xs leading-none transition-opacity',
              level <= props.value! ? 'opacity-100' : 'opacity-25 grayscale',
            )}
          >
            🌶
          </span>
        ))}
      </span>
    );
  }

  const { value, onChange } = props;

  return (
    <div className="flex items-center justify-between gap-2">
      <div
        role="radiogroup"
        aria-label="How much you want this"
        className="flex flex-1 items-center gap-1"
      >
        {LEVELS.map((level) => {
          const active = value != null && level <= value;
          return (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={value === level}
              aria-label={`${level} of ${MAX_LEVEL} — ${LEVEL_HINTS[level]}`}
              onClick={() => onChange(value === level ? undefined : level)}
              className={cn(
                'flex h-11 flex-1 items-center justify-center rounded-[var(--radius-md)] border text-lg transition-all',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                active
                  ? 'border-primary/40 bg-primary/10 scale-100'
                  : 'border-border/60 hover:border-border opacity-30 grayscale hover:opacity-60',
              )}
            >
              <span aria-hidden>🌶</span>
            </button>
          );
        })}
      </div>
      {value != null && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="text-muted-foreground hover:text-foreground shrink-0 text-xs transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
