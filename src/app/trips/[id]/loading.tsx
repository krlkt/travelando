import { TripCoverSkeleton } from '@/components/trips/TripCoverSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Instant navigation fallback for a trip's detail page while the server
 * component fetches the trip. Without this boundary the router blocks the whole
 * transition until the fetch resolves.
 */
export default function Loading() {
  return (
    <div className="relative">
      <TripCoverSkeleton actions={2} />
      <div className="mx-auto max-w-[var(--container-page)] px-4 pb-16 sm:px-6 md:px-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <div className="-mx-1 mb-4 flex gap-2 overflow-hidden px-1 pt-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-20 shrink-0 rounded-full" />
              ))}
            </div>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-4 w-12 shrink-0" />
                  <Skeleton className="h-20 flex-1 rounded-[var(--radius-lg)]" />
                </div>
              ))}
            </div>
          </div>
          <aside className="hidden min-w-0 space-y-4 lg:block">
            <Skeleton className="h-40 rounded-[var(--radius-lg)]" />
            <Skeleton className="h-40 rounded-[var(--radius-lg)]" />
          </aside>
        </div>
      </div>
    </div>
  );
}
