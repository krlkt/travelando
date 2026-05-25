'use client';

import { useEffect, type ReactNode } from 'react';
import { TripsProvider } from '@/lib/trips/context';
import { ensureAnonSession } from '@/lib/supabase/anon';
import type { Trip } from '@/lib/trips/types';

interface TripsBootstrapProps {
  trips: Trip[];
  children: ReactNode;
}

export function TripsBootstrap({ trips, children }: TripsBootstrapProps) {
  useEffect(() => {
    ensureAnonSession().catch((err) => {
      console.error('[travelando] anon session failed', err);
    });
  }, []);

  return <TripsProvider initialTrips={trips}>{children}</TripsProvider>;
}
