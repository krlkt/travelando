import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Pulsing placeholder shown while data loads. Keep its dimensions close to the
 * real content it stands in for so swapping skeleton → content doesn't shift
 * layout. Animates opacity only (via `animate-pulse`) to stay compositor-cheap.
 */
function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn('bg-muted animate-pulse rounded-md', className)}
      {...props}
    />
  );
}

export { Skeleton };
