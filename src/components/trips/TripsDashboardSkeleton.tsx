import { Skeleton } from '@/components/ui/skeleton';

/**
 * Navigation fallback for the `/trips` section while the layout fetches the
 * trip list. Shapes match the dashboard header + card grid so the real content
 * swaps in without a jump.
 */
export function TripsDashboardSkeleton() {
  return (
    <div className="px-4 pt-6 pb-16 sm:px-6 md:px-10 md:pt-14">
      <div className="mx-auto max-w-[var(--container-page)]">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-56 md:h-12 md:w-72" />
          </div>
          <Skeleton className="hidden h-11 w-32 md:block" />
        </div>

        <div className="mt-12 space-y-4">
          <Skeleton className="h-4 w-40" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-56 rounded-[var(--radius-xl)]" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
