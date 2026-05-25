import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseRepository } from '@/lib/trips/supabaseRepository';
import { TripsBootstrap } from '@/components/shell/TripsBootstrap';
import type { Trip } from '@/lib/trips/types';

export default async function TripsLayout({
  children,
}: {
  children: ReactNode;
}) {
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
