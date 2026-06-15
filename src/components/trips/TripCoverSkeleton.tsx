import { Skeleton } from '@/components/ui/skeleton';

interface TripCoverSkeletonProps {
  /** Number of top-right action placeholders (e.g. Live view + Members). */
  actions?: number;
}

/**
 * Placeholder for the gradient cover header shared by the trip detail and
 * expenses pages. Used as a route-level `loading.tsx` fallback, where the trip
 * (and its real gradient) hasn't been fetched yet — so it stands on a neutral
 * muted surface with translucent placeholders.
 */
export function TripCoverSkeleton({ actions = 0 }: TripCoverSkeletonProps) {
  return (
    <header className="bg-muted relative w-full overflow-hidden">
      <div className="relative mx-auto flex min-h-[14rem] max-w-[var(--container-page)] flex-col gap-6 px-4 pt-4 pb-16 sm:px-6 md:min-h-[18rem] md:px-10 md:pt-6 md:pb-20">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="bg-background/40 h-8 w-20" />
          {actions > 0 && (
            <div className="flex items-center gap-2">
              {Array.from({ length: actions }).map((_, i) => (
                <Skeleton key={i} className="bg-background/40 h-8 w-9" />
              ))}
            </div>
          )}
        </div>
        <div className="mt-auto space-y-3">
          <Skeleton className="bg-background/40 h-3 w-24" />
          <Skeleton className="bg-background/40 h-10 w-2/3" />
          <Skeleton className="bg-background/40 h-4 w-40" />
        </div>
      </div>
    </header>
  );
}
