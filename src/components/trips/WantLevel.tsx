'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_LEVEL = 5;
const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

type WantLevelVariant = 'chili' | 'star';

const VARIANT_HINTS: Record<WantLevelVariant, Record<number, string>> = {
  chili: {
    1: 'Mild curiosity',
    2: 'Would try',
    3: 'Keen',
    4: 'Really want',
    5: 'Must eat',
  },
  star: {
    1: 'Mild curiosity',
    2: 'Would do',
    3: 'Keen',
    4: 'Really want',
    5: 'Must do',
  },
};

interface WantLevelSelectProps {
  mode?: 'select';
  variant?: WantLevelVariant;
  value?: number;
  onChange: (value: number | undefined) => void;
}

interface WantLevelIndicatorProps {
  mode: 'indicator';
  variant?: WantLevelVariant;
  value?: number;
}

type WantLevelProps = WantLevelSelectProps | WantLevelIndicatorProps;

function Glyph({
  variant,
  active,
}: {
  variant: WantLevelVariant;
  active: boolean;
}) {
  if (variant === 'star') {
    return (
      <Star
        aria-hidden
        className={cn('size-3.5', active ? 'fill-current' : 'fill-none')}
      />
    );
  }
  return <span aria-hidden>🌶</span>;
}

/**
 * "Craving" meter for wishlist want level (1-5).
 * - `variant`: `chili` (food) or `star` (activities).
 * - `select`: tappable radiogroup with large hit areas for mobile.
 * - `indicator`: compact read-only meter for list rows.
 */
export function WantLevel(props: WantLevelProps) {
  const variant = props.variant ?? 'chili';
  const hints = VARIANT_HINTS[variant];

  if (props.mode === 'indicator') {
    if (!props.value) return null;
    return (
      <span
        className={cn(
          'flex shrink-0 items-center gap-px',
          variant === 'star' && 'text-amber-500',
        )}
        aria-label={`Want level ${props.value} of ${MAX_LEVEL}`}
      >
        {LEVELS.map((level) => (
          <span
            key={level}
            aria-hidden
            className={cn(
              'flex items-center text-xs leading-none transition-opacity',
              level <= props.value!
                ? 'opacity-100'
                : variant === 'star'
                  ? 'opacity-25'
                  : 'opacity-25 grayscale',
            )}
          >
            <Glyph variant={variant} active={level <= props.value!} />
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
              aria-label={`${level} of ${MAX_LEVEL} — ${hints[level]}`}
              onClick={() => onChange(value === level ? undefined : level)}
              className={cn(
                'flex h-11 flex-1 items-center justify-center rounded-[var(--radius-md)] border text-lg transition-all',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                active
                  ? variant === 'star'
                    ? 'scale-100 border-amber-400/50 bg-amber-400/10 text-amber-500'
                    : 'border-primary/40 bg-primary/10 scale-100'
                  : variant === 'star'
                    ? 'border-border/60 hover:border-border text-muted-foreground/40 hover:text-muted-foreground'
                    : 'border-border/60 hover:border-border opacity-30 grayscale hover:opacity-60',
              )}
            >
              <Glyph variant={variant} active={active} />
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
