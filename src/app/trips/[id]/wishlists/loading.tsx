import { Skeleton } from '@/components/ui/skeleton';

/**
 * Instant navigation fallback for the Wishlists page while the server component
 * fetches the trip.
 */
export default function Loading() {
  return (
    <div className="from-background via-background to-secondary/30 relative min-h-svh bg-gradient-to-b">
      <div className="relative mx-auto max-w-[var(--container-page)] px-4 pt-8 pb-28 sm:px-6 md:px-10">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-8 w-64" />
        <Skeleton className="mt-4 h-32 rounded-[var(--radius-lg)]" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
