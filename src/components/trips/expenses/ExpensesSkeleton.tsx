import { Skeleton } from '@/components/ui/skeleton';

/** Placeholder for the headline total figure while expenses load. */
export function ExpensesTotalsSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-9 w-40 sm:h-10" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

/** Placeholder for the category tiles, filter chips, and expense list. */
export function ExpensesBodySkeleton() {
  return (
    <div aria-busy className="mt-6 space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-[var(--radius-lg)]" />
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="border-border/70 bg-card flex items-center gap-3 rounded-[var(--radius-lg)] border p-4"
          >
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
