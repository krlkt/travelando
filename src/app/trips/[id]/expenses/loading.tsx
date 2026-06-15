import { TripCoverSkeleton } from '@/components/trips/TripCoverSkeleton';
import {
  ExpensesBodySkeleton,
  ExpensesTotalsSkeleton,
} from '@/components/trips/expenses/ExpensesSkeleton';

/**
 * Instant navigation fallback for the expenses page while the server component
 * fetches the trip. Mirrors the page layout so content swaps in without a jump.
 */
export default function Loading() {
  return (
    <div className="relative">
      <TripCoverSkeleton />
      <div className="mx-auto max-w-[var(--container-page)] px-4 pb-24 sm:px-6 md:px-10">
        <section className="border-border/70 bg-card mt-4 rounded-[var(--radius-xl)] border p-5 sm:p-6">
          <ExpensesTotalsSkeleton />
        </section>
        <ExpensesBodySkeleton />
      </div>
    </div>
  );
}
