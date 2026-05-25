'use client';

import type { ReactNode } from 'react';
import { TripsProvider } from '@/lib/trips/context';
import type { Trip } from '@/lib/trips/types';

interface TripsBootstrapProps {
  trips: Trip[];
  children: ReactNode;
}

export function TripsBootstrap({ trips, children }: TripsBootstrapProps) {
  return <TripsProvider initialTrips={trips}>{children}</TripsProvider>;
}
