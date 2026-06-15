import { Skeleton } from '@/components/ui/skeleton';

/**
 * Instant navigation fallback for the Live view while the server component
 * fetches the trip.
 */
export default function Loading() {
  return (
    <div className="from-background via-background to-secondary/30 relative min-h-svh bg-gradient-to-b">
      <div className="relative mx-auto max-w-[var(--container-page)] px-4 pt-8 pb-24 sm:px-6 md:px-10">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-4 h-48 rounded-[var(--radius-xl)]" />
        <Skeleton className="mt-4 h-32 rounded-[var(--radius-lg)]" />
        <div className="mt-8 space-y-3">
          <Skeleton className="h-3 w-20" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
