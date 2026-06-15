import { Suspense, type ReactNode } from 'react';
import { TripsDataProvider } from '@/components/shell/TripsDataProvider';
import { TripsDashboardSkeleton } from '@/components/trips/TripsDashboardSkeleton';

export default function TripsLayout({ children }: { children: ReactNode }) {
  // The layout itself stays synchronous; the trip-list fetch lives in
  // TripsDataProvider behind a Suspense boundary, so navigating into /trips
  // shows a skeleton immediately instead of blocking on the fetch.
  return (
    <Suspense fallback={<TripsDashboardSkeleton />}>
      <TripsDataProvider>{children}</TripsDataProvider>
    </Suspense>
  );
}
