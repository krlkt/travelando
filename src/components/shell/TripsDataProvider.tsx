import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseRepository } from '@/lib/trips/supabaseRepository';
import { TripsBootstrap } from './TripsBootstrap';
import type { Trip } from '@/lib/trips/types';

/**
 * Async server component that fetches every trip and seeds the client
 * `TripsProvider`. Kept separate from the layout so the layout can stay
 * synchronous and wrap this in a Suspense boundary — that's what lets the
 * router paint a skeleton instantly on the first navigation into `/trips`
 * instead of blocking until `findAll` resolves.
 */
export async function TripsDataProvider({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const repo = createSupabaseRepository(supabase);

  let trips: Trip[] = [];
  try {
    trips = await repo.findAll();
  } catch (err) {
    console.error('[travelando] trips findAll failed', err);
  }

  return <TripsBootstrap trips={trips}>{children}</TripsBootstrap>;
}
